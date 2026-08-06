import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/products  (public storefront listing with filters)
export async function listProducts(req, res, next) {
  try {
    const {
      search,
      category,
      ageGroup,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 12,
      featured,
    } = req.query;

    const filter = { isActive: true };
    if (category) {
      const cat = await Category.findOne({ slug: category });
      // An unknown slug must narrow to nothing. Leaving the filter off would
      // quietly return the whole catalogue as if no category had been asked for.
      if (!cat) {
        return res.json({ items: [], page: 1, pages: 0, total: 0 });
      }
      filter.category = cat._id;
    }
    if (ageGroup && ageGroup !== 'all') filter.ageGroup = ageGroup;
    if (featured === 'true') filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const sortMap = {
      newest: { createdAt: -1 },
      priceLow: { price: 1 },
      priceHigh: { price: -1 },
      popular: { unitsSold: -1 },
      rating: { rating: -1 },
    };

    const pageNum = Math.max(1, Number(page));
    const perPage = Math.min(48, Number(limit));

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
    next(err);
  }
}

// GET /api/products/:slug
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// ---- Admin ----

// GET /api/products/admin/all  (includes inactive)
export async function adminListProducts(req, res, next) {
  try {
    const items = await Product.find().populate('category', 'name slug').sort({ createdAt: -1 });
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
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.slug) data.slug = slugify(data.slug);
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
