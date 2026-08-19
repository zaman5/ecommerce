import Category from '../models/Category.js';
import Product from '../models/Product.js';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/categories
// Returns the flat list with `parent` as a slug, so the client can build the
// two-level tree without a second request. A department's count includes
// everything filed under its sub-categories, which is what a shopper expects
// "Electronics (4)" to mean.
export async function listCategories(req, res, next) {
  try {
    const cats = await Category.find().sort({ name: 1 });

    // One grouped count instead of a query per category. The stock condition
    // mirrors the storefront's product filter — counting a sold-out product
    // here would advertise "Electronics (4)" and then list three.
    const counts = await Product.aggregate([
      { $match: { isActive: true, stock: { $gt: 0 } } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]).catch(() => []);
    const ownCount = new Map(counts.map((c) => [String(c._id), c.n]));
    const slugById = new Map(cats.map((c) => [String(c._id), c.slug]));

    const rolledUp = new Map();
    for (const c of cats) {
      const id = String(c._id);
      const own = ownCount.get(id) || 0;
      rolledUp.set(id, (rolledUp.get(id) || 0) + own);
      if (c.parent) {
        const pid = String(c.parent);
        rolledUp.set(pid, (rolledUp.get(pid) || 0) + own);
      }
    }

    res.json(
      cats.map((c) => ({
        ...c.toObject(),
        parent: c.parent ? slugById.get(String(c.parent)) ?? null : null,
        productCount: rolledUp.get(String(c._id)) || 0,
      }))
    );
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.json([]);
  }
}


/**
 * Resolves and vets a requested parent. The tree is intentionally two levels
 * deep, so a parent must itself be top-level.
 *
 * @returns {{error: string}} on rejection, otherwise `{parent: id | null}`.
 */
async function resolveParent(parentId, selfId) {
  if (!parentId) return { parent: null };
  if (selfId && String(parentId) === String(selfId)) {
    return { error: 'A category cannot be its own parent.' };
  }
  const parent = await Category.findById(parentId).catch(() => null);
  if (!parent) return { error: 'That parent category does not exist.' };
  if (parent.parent) {
    return { error: `"${parent.name}" is already a sub-category — categories only nest two levels deep.` };
  }
  return { parent: parent._id };
}

// POST /api/categories  (admin)
export async function createCategory(req, res, next) {
  try {
    const data = { ...req.body };
    if (!data.name || !String(data.name).trim()) {
      return res.status(400).json({ message: 'A category needs a name.' });
    }
    data.slug = slugify(data.slug || data.name);

    const taken = await Category.findOne({ slug: data.slug });
    if (taken) return res.status(400).json({ message: `The slug "${data.slug}" is already taken.` });

    const resolved = await resolveParent(data.parent, null);
    if (resolved.error) return res.status(400).json({ message: resolved.error });
    data.parent = resolved.parent;

    const cat = await Category.create(data);
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
}

// PUT /api/categories/:id  (admin)
export async function updateCategory(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.slug) data.slug = slugify(data.slug);

    if (data.slug) {
      const clash = await Category.findOne({ slug: data.slug, _id: { $ne: req.params.id } });
      if (clash) return res.status(400).json({ message: `The slug "${data.slug}" is already taken.` });
    }

    if ('parent' in data) {
      const resolved = await resolveParent(data.parent, req.params.id);
      if (resolved.error) return res.status(400).json({ message: resolved.error });
      // Giving a department a parent would push its own children to level three.
      if (resolved.parent) {
        const children = await Category.countDocuments({ parent: req.params.id });
        if (children > 0) {
          return res.status(400).json({
            message: 'This category has sub-categories, so it cannot become a sub-category itself.',
          });
        }
      }
      data.parent = resolved.parent;
    }

    const cat = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ message: 'Category not found.' });
    res.json(cat);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/categories/:id  (admin)
export async function deleteCategory(req, res, next) {
  try {
    const inUse = await Product.countDocuments({ category: req.params.id });
    if (inUse > 0) {
      return res.status(400).json({ message: `Cannot delete: ${inUse} product(s) use this category.` });
    }
    // Deleting a department out from under its children would orphan them and
    // break every "browse this department" query.
    const children = await Category.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${children} sub-categor${children === 1 ? 'y sits' : 'ies sit'} under this one. Remove them first.`,
      });
    }
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}
