import { getCategory } from '../models/Category.js';
import { getProduct } from '../models/Product.js';
import { Op } from 'sequelize';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/categories
export async function listCategories(req, res, next) {
  try {
    const Category = getCategory();
    const Product = getProduct();

    const cats = await Category.findAll({ order: [['name', 'ASC']] });

    // One grouped count
    const counts = await Product.findAll({
      where: { isActive: true, stock: { [Op.gt]: 0 } },
      attributes: ['categoryId', [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'n']],
      group: ['categoryId'],
      raw: true,
    });
    const ownCount = new Map(counts.map((c) => [c.categoryId, parseInt(c.n)]));

    const slugById = new Map(cats.map((c) => [c.id, c.slug]));

    const rolledUp = new Map();
    for (const c of cats) {
      const id = c.id;
      const own = ownCount.get(id) || 0;
      rolledUp.set(id, (rolledUp.get(id) || 0) + own);
      if (c.parentId) {
        const pid = c.parentId;
        rolledUp.set(pid, (rolledUp.get(pid) || 0) + own);
      }
    }

    res.json(
      cats.map((c) => ({
        ...c.toJSON(),
        parent: c.parentId ? slugById.get(c.parentId) ?? null : null,
        productCount: rolledUp.get(c.id) || 0,
      }))
    );
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.json([]);
  }
}


/**
 * Resolves and vets a requested parent.
 */
async function resolveParent(parentId, selfId) {
  const Category = getCategory();
  if (!parentId) return { parent: null };
  if (selfId && String(parentId) === String(selfId)) {
    return { error: 'A category cannot be its own parent.' };
  }
  const parent = await Category.findByPk(parentId).catch(() => null);
  if (!parent) return { error: 'That parent category does not exist.' };
  if (parent.parentId) {
    return { error: `"${parent.name}" is already a sub-category — categories only nest two levels deep.` };
  }
  return { parent: parent.id };
}

// POST /api/categories  (admin)
export async function createCategory(req, res, next) {
  try {
    const Category = getCategory();
    const data = { ...req.body };
    if (!data.name || !String(data.name).trim()) {
      return res.status(400).json({ message: 'A category needs a name.' });
    }
    data.slug = slugify(data.slug || data.name);

    const taken = await Category.findOne({ where: { slug: data.slug } });
    if (taken) return res.status(400).json({ message: `The slug "${data.slug}" is already taken.` });

    const resolved = await resolveParent(data.parent || data.parentId, null);
    if (resolved.error) return res.status(400).json({ message: resolved.error });
    data.parentId = resolved.parent;
    delete data.parent;

    const cat = await Category.create(data);
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
}

// PUT /api/categories/:id  (admin)
export async function updateCategory(req, res, next) {
  try {
    const Category = getCategory();
    const data = { ...req.body };
    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.slug) data.slug = slugify(data.slug);

    if (data.slug) {
      const clash = await Category.findOne({
        where: { slug: data.slug, id: { [Op.ne]: req.params.id } },
      });
      if (clash) return res.status(400).json({ message: `The slug "${data.slug}" is already taken.` });
    }

    if ('parent' in data || 'parentId' in data) {
      const parentVal = data.parent || data.parentId;
      const resolved = await resolveParent(parentVal, req.params.id);
      if (resolved.error) return res.status(400).json({ message: resolved.error });
      if (resolved.parent) {
        const children = await Category.count({ where: { parentId: req.params.id } });
        if (children > 0) {
          return res.status(400).json({
            message: 'This category has sub-categories, so it cannot become a sub-category itself.',
          });
        }
      }
      data.parentId = resolved.parent;
      delete data.parent;
    }

    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found.' });

    await cat.update(data);
    res.json(cat);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/categories/:id  (admin)
export async function deleteCategory(req, res, next) {
  try {
    const Category = getCategory();
    const Product = getProduct();

    const inUse = await Product.count({ where: { categoryId: req.params.id } });
    if (inUse > 0) {
      return res.status(400).json({ message: `Cannot delete: ${inUse} product(s) use this category.` });
    }
    const children = await Category.count({ where: { parentId: req.params.id } });
    if (children > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${children} sub-categor${children === 1 ? 'y sits' : 'ies sit'} under this one. Remove them first.`,
      });
    }
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found.' });
    await cat.destroy();
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}
