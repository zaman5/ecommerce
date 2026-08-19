import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';
import { scopedProductIds, canManageProduct } from '../middleware/auth.js';

// A colour name goes into a RegExp, so anything special in it must be literal
// — otherwise a crafted name changes what the query matches.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every category id a slug should match: the category itself plus, when it is a
 * top-level department, its sub-categories. Browsing "Electronics" has to
 * return the phones and laptops filed underneath it, not just anything left
 * sitting directly on the parent.
 *
 * @returns null when the slug matches no category, so callers can tell "unknown
 *          category" apart from "category with nothing in it".
 */
async function categoryIdsFor(slug) {
  const cat = await Category.findOne({ slug });
  if (!cat) return null;
  const children = await Category.find({ parent: cat._id }).select('_id');
  return [cat._id, ...children.map((c) => c._id)];
}

/**
 * A query-string value as a usable integer.
 *
 * Everything in req.query is a string that may be absent, empty or nonsense,
 * and none of it can be handed to Mongo unchecked: a NaN reaching $skip aborts
 * the whole aggregation with a 500, and a NaN `pages` serialises to null, which
 * leaves the client's pager with nothing to render.
 */
function toInt(value, fallback, { min = 1, max = Infinity } = {}) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * The words a shopper actually typed, lower-cased and stripped of punctuation.
 * Capped because each term becomes its own regex pass over the catalogue.
 */
function searchTerms(query) {
  return String(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * A term together with its singular/plural counterparts.
 *
 * Prefix matching on its own is asymmetric: "bag" finds "bags", but "bags"
 * finds nothing called "bag", so searching the plural returned *fewer* results
 * than the singular. Spelling out the counterparts fixes that in both
 * directions without truncating to a stem — chopping "toy" down to "to" would
 * prefix-match "towel" and "tote".
 */
function termVariants(term) {
  const v = new Set([term]);
  if (/ies$/.test(term)) v.add(term.slice(0, -3) + 'y'); // diaries -> diary
  else if (/([sxz]|ch|sh)es$/.test(term)) v.add(term.slice(0, -2)); // boxes -> box
  else if (/es$/.test(term)) v.add(term.slice(0, -1)); // bottles -> bottle
  else if (/s$/.test(term) && !/ss$/.test(term)) v.add(term.slice(0, -1)); // bags -> bag
  else if (/y$/.test(term)) v.add(term.slice(0, -1) + 'ies'); // diary -> diaries
  return [...v].filter(Boolean);
}

/**
 * Matches a term at the start of a word, so "bag" finds "Bag" and "bags" but a
 * two-letter query doesn't drag in every product containing those letters
 * mid-word.
 */
function termRegex(term) {
  const alts = termVariants(term).map(escapeRegex).join('|');
  return new RegExp(`\\b(?:${alts})`, 'i');
}

/**
 * For each term, the categories whose own name contains it — "bag" hits both
 * "Bags & Wallets" and "Trolley Bags". Being filed under a matching category
 * says a product *is* the thing searched for, which a name alone doesn't: the
 * "Garden Tool Set with Carry Bag" has "bag" in its name too.
 *
 * @returns one id array per term, aligned with `terms`.
 */
async function categoryIdsPerTerm(terms) {
  const all = await Category.find().select('_id name parent');

  return terms.map((term) => {
    const rx = termRegex(term);
    const matched = all.filter((c) => rx.test(c.name));
    const ids = new Set(matched.map((c) => String(c._id)));

    // Products are filed on the leaves, so a department name on its own matches
    // nothing. "Water Bottles" is a parent whose children are "Insulated
    // Bottles" and "Sports Bottles" — without this, searching "water bottle"
    // found only the one product with both words in its own name and missed
    // every actual water bottle in the department.
    for (const c of all) {
      if (c.parent && ids.has(String(c.parent))) ids.add(String(c._id));
    }
    return [...ids].map((id) => all.find((c) => String(c._id) === id)._id);
  });
}

/**
 * How well a product answers the query, as an aggregation expression.
 *
 * A hit in the name is worth far more than one in the description: a shopper
 * searching "bag" wants bags, not the tool set that ships *with* a canvas bag.
 * Description hits still score, so they surface — just underneath the real
 * matches — rather than being dropped entirely.
 */
function relevanceExpr(terms, catIdsPerTerm) {
  const field = (path) => ({ $ifNull: [path, ''] });
  const hit = (path, regex, points) => ({
    $cond: [{ $regexMatch: { input: field(path), regex } }, points, 0],
  });

  const parts = [];
  terms.forEach((term, i) => {
    const rx = termRegex(term);
    parts.push(hit('$name', rx, 10), hit('$brand', rx, 4), hit('$description', rx, 1));
    if (catIdsPerTerm[i].length) {
      // Weighted above the "name starts with the query" bonus below: being
      // filed under Laptops says the product *is* a laptop, whereas leading
      // with the word only says it mentions one. Searching "laptop" used to
      // rank the Laptop-Ready Rucksack above the actual laptop.
      parts.push({ $cond: [{ $in: ['$category', catIdsPerTerm[i]] }, 25, 0] });
    }
    // A colour the shopper can see on the filter rail has to be searchable too:
    // "navy" returned nothing while eight products offered a Navy option.
    // Scored below a name hit — the colour is a variant, not the product.
    parts.push({
      $cond: [
        {
          $gt: [
            {
              $size: {
                $filter: {
                  input: { $ifNull: ['$colors', []] },
                  as: 'c',
                  cond: { $regexMatch: { input: { $ifNull: ['$$c.name', ''] }, regex: rx } },
                },
              },
            },
            0,
          ],
        },
        6,
        0,
      ],
    });
  });

  // All the words together, in order — "shoulder bag" should beat a product
  // that merely mentions both words in unrelated places.
  const phrase = terms.map(escapeRegex).join('\\s+');
  parts.push(hit('$name', new RegExp(`\\b${phrase}`, 'i'), 50));
  parts.push(hit('$name', new RegExp(`^${phrase}`, 'i'), 20));

  return { $add: parts };
}

/**
 * The `$and` clause that narrows a query to products matching every typed word.
 * Shared so the colour facet counts the same rows the listing shows.
 *
 * @returns `{ terms, catIdsPerTerm, clause }` — `clause` is null when the query
 *          holds no searchable words, meaning "don't narrow anything".
 */
async function buildSearchClause(search) {
  const terms = search ? searchTerms(search) : [];
  if (!terms.length) return { terms, catIdsPerTerm: [], clause: null };

  const catIdsPerTerm = await categoryIdsPerTerm(terms);
  const clause = terms.map((term, i) => {
    const rx = termRegex(term);
    // 'colors.name' so a shopper can search the colours the filter rail offers.
    const clauses = [{ name: rx }, { brand: rx }, { description: rx }, { 'colors.name': rx }];
    // Lets someone find every bag by searching "bags", even where the word
    // appears nowhere on the product itself.
    if (catIdsPerTerm[i].length) clauses.push({ category: { $in: catIdsPerTerm[i] } });
    return { $or: clauses };
  });

  return { terms, catIdsPerTerm, clause };
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * The Mongo filter behind a storefront query.
 *
 * Shared by the listing and the colour facet on purpose. The facet used to
 * accept only `category`, so its counts ignored whatever else was active: with
 * a search for "bag" the Blue swatch still advertised 4 products and returned
 * none when clicked. Building both from one function means a swatch can never
 * promise a count the click won't deliver.
 *
 * @param opts.ignoreColor leave the colour narrowing off — the facet asks how
 *        many products *each* colour would return, so it must not already be
 *        narrowed to one of them.
 * @returns `unknownCategory` when the slug matches no category, which has to
 *          narrow to nothing rather than fall through to the whole catalogue.
 */
async function buildProductFilter(query, { ignoreColor = false } = {}) {
  const { search, category, minPrice, maxPrice, featured, onSale, flashSale, color } = query;
  // Sold out means gone from the storefront entirely — not listed, not counted
  // in a facet, not reachable by URL (see getProduct). Restocking brings the
  // product straight back; nothing is deleted. Admin queries deliberately do
  // NOT go through here, so the admin panel still sees everything.
  const filter = { isActive: true, stock: { $gt: 0 } };

  // "Deals" — anything whose compareAtPrice is genuinely above what it sells
  // for. Comparing two fields of the same document needs $expr; a plain
  // { compareAtPrice: { $gt: '$price' } } would match the literal string.
  if (onSale === 'true' || flashSale === 'true') {
    filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  }
  // The Flash Sale strip is opt-in per product AND requires a live discount, so
  // un-discounting a product removes it from the strip without anyone having to
  // remember to untick it too.
  if (flashSale === 'true') filter.isFlashSale = true;
  if (category) {
    const ids = await categoryIdsFor(category);
    if (!ids) return { unknownCategory: true };
    filter.category = { $in: ids };
  }
  if (color && !ignoreColor) {
    // Matched on the colour's name, exactly and case-insensitively, so that
    // "Navy" cannot also pull in a hypothetical "Navy Stripe".
    filter['colors.name'] = new RegExp(`^${escapeRegex(color)}$`, 'i');
  }
  if (featured === 'true') filter.isFeatured = true;
  // An `inStock` parameter is accepted and ignored — everything returned is in
  // stock now, so narrowing to it would be a no-op. Older bookmarked URLs
  // carrying `inStock=true` therefore still work.
  if (minPrice || maxPrice) {
    // A bound that isn't a number is dropped rather than passed through: it
    // would reach Mongo as NaN and come back as a CastError 500-turned-400
    // reading "Invalid price: NaN", which tells a shopper nothing.
    const bound = (raw) => (raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null);
    const min = bound(minPrice);
    const max = bound(maxPrice);
    const range = {};
    if (min !== null) range.$gte = min;
    if (max !== null) range.$lte = max;
    if (Object.keys(range).length) filter.price = range;
  }
  // Every word has to appear somewhere on the product. A $text search would
  // OR them instead, so "baby bag" would return every product mentioning
  // "baby" — which is most of the catalogue.
  const { terms, catIdsPerTerm, clause } = await buildSearchClause(search);
  if (clause) filter.$and = clause;

  return { filter, terms, catIdsPerTerm, unknownCategory: false };
}

// GET /api/products  (public storefront listing with filters)
export async function listProducts(req, res, next) {
  try {
    const { sort = 'newest', page = 1, limit = 12 } = req.query;

    const { filter, terms, catIdsPerTerm, unknownCategory } = await buildProductFilter(req.query);
    if (unknownCategory) return res.json({ items: [], page: 1, pages: 0, total: 0 });

    // Every sort ends with _id. None of these keys is unique — the seed inserts
    // products in bulk so dozens share a createdAt, and prices/ratings repeat
    // freely. Without a unique tiebreaker Mongo is free to order ties
    // differently on each query, so paginated windows overlap: the same product
    // shows on two pages and another is never returned at all.
    const sortMap = {
      newest: { createdAt: -1, _id: -1 },
      priceLow: { price: 1, _id: 1 },
      priceHigh: { price: -1, _id: 1 },
      popular: { unitsSold: -1, _id: 1 },
      rating: { rating: -1, _id: 1 },
    };

    const pageNum = toInt(page, 1);
    const perPage = toInt(limit, 12, { max: 48 });

    // The shop's default sort is labelled "Best Match", so when there is
    // something to match against, honour that literally and order by relevance.
    // Any explicitly chosen sort (price, rating…) still wins.
    if (terms.length && sort === 'newest') {
      const [facet] = await Product.aggregate([
        { $match: filter },
        { $addFields: { _score: relevanceExpr(terms, catIdsPerTerm) } },
        // unitsSold breaks ties towards what people actually buy; _id keeps the
        // remainder stable so paginated windows don't overlap.
        { $sort: { _score: -1, unitsSold: -1, _id: 1 } },
        { $unset: '_score' },
        {
          $facet: {
            items: [{ $skip: (pageNum - 1) * perPage }, { $limit: perPage }],
            total: [{ $count: 'count' }],
          },
        },
      ]);

      const found = facet.total[0]?.count ?? 0;
      // aggregate() returns plain documents, so populate them by hand.
      await Product.populate(facet.items, { path: 'category', select: 'name slug' });

      return res.json({
        items: facet.items,
        page: pageNum,
        pages: Math.ceil(found / perPage),
        total: found,
      });
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sortMap[sort] || sortMap.newest)
        .skip((pageNum - 1) * perPage)
        .limit(perPage),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      page: pageNum,
      pages: Math.ceil(total / perPage),
      total,
    });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.json({
      items: [],
      page: 1,
      pages: 1,
      total: 0,
    });
  }
}

// GET /api/products/colors  — every colour currently orderable, for the shop's
// colour filter. Scoped to the category *and* the search term when either is
// given, so the filter only ever offers colours that can actually return a
// result: on a search for "bag" the facet has to count the eight bags, not the
// whole catalogue, or it offers "Navy (24)" against eight visible products.
export async function listColors(req, res, next) {
  try {
    // Same filter as the listing, minus the colour itself — the counts have to
    // describe what clicking each swatch will actually return.
    const { filter, unknownCategory } = await buildProductFilter(req.query, { ignoreColor: true });
    if (unknownCategory) return res.json([]);

    const rows = await Product.aggregate([
      { $match: filter },
      { $unwind: '$colors' },
      // Group on the lower-cased name so the same colour entered with different
      // capitalisation collapses into one option.
      {
        $group: {
          _id: { $toLower: '$colors.name' },
          name: { $first: '$colors.name' },
          hex: { $first: '$colors.hex' },
          count: { $sum: 1 },
        },
      },
      { $sort: { name: 1 } },
      { $project: { _id: 0, name: 1, hex: 1, count: 1 } },
    ]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:slug
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    // Hiding a sold-out product from the listings but still serving it here
    // would leave it reachable by URL — from a search engine, a shared link or
    // a saved item — which is exactly what "nobody sees it" rules out. Same
    // 404 as a product that doesn't exist, so the response can't be used to
    // probe which products are merely out of stock.
    if (product.stock <= 0) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// ---- Admin ----

// GET /api/products/admin/all  (includes inactive)
// Shop managers see only their scoped products; admins see everything.
export async function adminListProducts(req, res, next) {
  try {
    const ids = await scopedProductIds(req.user);
    const filter = ids ? { _id: { $in: ids } } : {};
    const items = await Product.find(filter).populate('category', 'name slug').sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// POST /api/products
export async function createProduct(req, res, next) {
  try {
    const data = { ...req.body };
    data.slug = slugify(data.slug || data.name);
    // Rich text from the admin editor — never store it unfiltered.
    if (data.description !== undefined) data.description = sanitizeHtml(data.description);

    // Shop managers may only create products within their assigned categories.
    if (req.user.role === 'shopmanager') {
      const allowedCats = (req.user.assignedCategories || []).map((id) => id.toString());
      // Also include sub-categories of assigned departments.
      const children = await Category.find({ parent: { $in: req.user.assignedCategories } }).select('_id');
      for (const c of children) allowedCats.push(c._id.toString());
      if (!data.category || !allowedCats.includes(data.category.toString())) {
        return res.status(403).json({ message: 'You can only add products to your assigned categories.' });
      }
    }

    const product = await Product.create(data);
    if (req.user.role === 'shopmanager') {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { assignedProducts: product._id } });
    }
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res, next) {
  try {
    const data = { ...req.body };

    // Shop manager scope check.
    if (req.user.role === 'shopmanager') {
      const allowed = await canManageProduct(req.user, req.params.id);
      if (!allowed) return res.status(403).json({ message: 'You do not have access to this product.' });

      if (data.category) {
        const allowedCats = (req.user.assignedCategories || []).map((id) => id.toString());
        const children = await Category.find({ parent: { $in: req.user.assignedCategories } }).select('_id');
        for (const c of children) allowedCats.push(c._id.toString());
        if (!allowedCats.includes(data.category.toString())) {
          return res.status(403).json({ message: 'You cannot assign a product to a category you do not manage.' });
        }
      }
    }
    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.slug) data.slug = slugify(data.slug);
    if (data.description !== undefined) data.description = sanitizeHtml(data.description);
    const product = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res, next) {
  try {
    // Shop manager scope check.
    if (req.user.role === 'shopmanager') {
      const allowed = await canManageProduct(req.user, req.params.id);
      if (!allowed) return res.status(403).json({ message: 'You do not have access to this product.' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    // Reviews are meaningless once their product is gone, and the unique
    // (product, user) index would otherwise keep blocking a re-created product.
    await Review.deleteMany({ product: product._id });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
}
