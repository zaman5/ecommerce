import Category from '../models/Category.js';
import Product from '../models/Product.js';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/categories
export async function listCategories(req, res, next) {
  try {
    const cats = await Category.find().sort({ name: 1 });
    // attach product counts
    const withCounts = await Promise.all(
      cats.map(async (c) => {
        const count = await Product.countDocuments({ category: c._id, isActive: true });
        return { ...c.toObject(), productCount: count };
      })
    );
    res.json(withCounts);
  } catch (err) {
    next(err);
  }
}

// POST /api/categories  (admin)
export async function createCategory(req, res, next) {
  try {
    const data = { ...req.body };
    data.slug = slugify(data.slug || data.name);
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
    const cat = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
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
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}
