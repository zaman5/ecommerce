import { getProduct as getProductModel, getProductColor } from '../models/Product.js';
import { getCategory } from '../models/Category.js';
import { getReview } from '../models/Review.js';
import { getUser } from '../models/User.js';
import { sanitizeHtml } from '../utils/sanitizeHtml.js';
import { scopedProductIds, canManageProduct } from '../middleware/auth.js';
import { Op, fn, col, literal } from 'sequelize';

function toInt(value, fallback, { min = 1, max = Infinity } = {}) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Every category id a slug should match: the category itself plus its children.
 */
async function categoryIdsFor(slug) {
  const Category = getCategory();
  const cat = await Category.findOne({ where: { slug } });
  if (!cat) return null;
  const children = await Category.findAll({
    where: { parentId: cat.id },
    attributes: ['id'],
  });
  return [cat.id, ...children.map((c) => c.id)];
}

/**
 * Build filter conditions for product queries.
 */
async function buildProductFilter(query, { ignoreColor = false } = {}) {
  const Product = getProductModel();
  const Category = getCategory();
  const ProductColor = getProductColor();
  const { search, category, minPrice, maxPrice, featured, onSale, flashSale, color } = query;

  const where = { isActive: true, stock: { [Op.gt]: 0 } };

  if (onSale === 'true' || flashSale === 'true') {
    where[Op.and] = [
      ...(where[Op.and] || []),
      literal('compare_at_price > price'),
    ];
  }
  if (flashSale === 'true') where.isFlashSale = true;

  if (category) {
    const ids = await categoryIdsFor(category);
    if (!ids) return { unknownCategory: true };
    where.categoryId = { [Op.in]: ids };
  }

  if (featured === 'true') where.isFeatured = true;

  if (minPrice || maxPrice) {
    const bound = (raw) => (raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null);
    const min = bound(minPrice);
    const max = bound(maxPrice);
    if (min !== null || max !== null) {
      const range = {};
      if (min !== null) range[Op.gte] = min;
      if (max !== null) range[Op.lte] = max;
      where.price = range;
    }
  }

  // Search terms
  let searchTerms = [];
  if (search) {
    searchTerms = String(search)
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .slice(0, 8);

    if (searchTerms.length) {
      const searchConditions = searchTerms.map((term) => {
        const like = `%${term}%`;
        return {
          [Op.or]: [
            { name: { [Op.like]: like } },
            { brand: { [Op.like]: like } },
            { description: { [Op.like]: like } },
          ],
        };
      });
      where[Op.and] = [...(where[Op.and] || []), ...searchConditions];
    }
  }

  // Color filter — find product IDs that have this color
  let colorProductIds = null;
  if (color && !ignoreColor) {
    const colorRows = await ProductColor.findAll({
      where: { name: { [Op.like]: color } },
      attributes: ['productId'],
      raw: true,
    });
    colorProductIds = colorRows.map((r) => r.productId);
    if (colorProductIds.length === 0) {
      // No products match this color
      where.id = { [Op.in]: [] };
    } else {
      if (where.id) {
        // Merge with existing id filter
        where.id = { [Op.in]: colorProductIds };
      } else {
        where.id = { [Op.in]: colorProductIds };
      }
    }
  }

  return { where, searchTerms, unknownCategory: false };
}

// GET /api/products  (public storefront listing with filters)
export async function listProducts(req, res, next) {
  try {
    const Product = getProductModel();
    const ProductColor = getProductColor();
    const { sort = 'newest', page = 1, limit = 12 } = req.query;

    const { where, searchTerms, unknownCategory } = await buildProductFilter(req.query);
    if (unknownCategory) return res.json({ items: [], page: 1, pages: 0, total: 0 });

    const sortMap = {
      newest: [['createdAt', 'DESC'], ['id', 'DESC']],
      priceLow: [['price', 'ASC'], ['id', 'ASC']],
      priceHigh: [['price', 'DESC'], ['id', 'ASC']],
      popular: [['unitsSold', 'DESC'], ['id', 'ASC']],
      rating: [['rating', 'DESC'], ['id', 'ASC']],
    };

    const pageNum = toInt(page, 1);
    const perPage = toInt(limit, 12, { max: 48 });

    const { count: total, rows: items } = await Product.findAndCountAll({
      where,
      include: [
        { association: 'category', attributes: ['id', 'name', 'slug'] },
        { association: 'colors', attributes: ['name', 'hex', 'image'] },
      ],
      order: sortMap[sort] || sortMap.newest,
      offset: (pageNum - 1) * perPage,
      limit: perPage,
      distinct: true,
    });

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

// GET /api/products/colors
export async function listColors(req, res, next) {
  try {
    const Product = getProductModel();
    const ProductColor = getProductColor();

    const { where, unknownCategory } = await buildProductFilter(req.query, { ignoreColor: true });
    if (unknownCategory) return res.json([]);

    // Get product IDs matching the filter
    const products = await Product.findAll({
      where,
      attributes: ['id'],
      raw: true,
    });
    const productIds = products.map((p) => p.id);

    if (!productIds.length) return res.json([]);

    const rows = await ProductColor.findAll({
      where: { productId: { [Op.in]: productIds } },
      attributes: [
        'name',
        'hex',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['name', 'hex'],
      raw: true,
    });

    res.json(rows.map((r) => ({ name: r.name, hex: r.hex, count: parseInt(r.count, 10) || 1 })));
  } catch (err) {
    console.error('Error fetching colors:', err.message);
    res.json([]);
  }
}

// GET /api/products/:slugOrId
export async function getProduct(req, res, next) {
  try {
    const Product = getProductModel();
    const param = req.params.slug;
    const isNumeric = /^\d+$/.test(param);
    const where = isNumeric
      ? { [Op.or]: [{ id: parseInt(param, 10) }, { slug: param }] }
      : { slug: param };

    const product = await Product.findOne({
      where,
      include: [
        { association: 'category', attributes: ['id', 'name', 'slug'] },
        { association: 'colors', attributes: ['name', 'hex', 'image'] },
      ],
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (product.stock <= 0) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}
export const getProductBySlug = getProduct;

// ---- Admin ----

// GET /api/products/admin/all
export async function adminListProducts(req, res, next) {
  try {
    const Product = getProductModel();
    const ids = await scopedProductIds(req.user);
    const where = ids ? { id: { [Op.in]: ids } } : {};
    const items = await Product.findAll({
      where,
      include: [
        { association: 'category', attributes: ['id', 'name', 'slug'] },
        { association: 'colors', attributes: ['name', 'hex', 'image'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// POST /api/products
export async function createProduct(req, res, next) {
  try {
    const Product = getProductModel();
    const ProductColor = getProductColor();
    const Category = getCategory();
    const User = getUser();

    const data = { ...req.body };
    data.slug = slugify(data.slug || data.name);
    if (data.description !== undefined) data.description = sanitizeHtml(data.description);

    // Handle category field -> categoryId
    if (data.category && !data.categoryId) {
      data.categoryId = data.category;
      delete data.category;
    }

    // Shop managers may only create products within their assigned categories.
    if (req.user.role === 'shopmanager') {
      const fullUser = await User.findByPk(req.user.id, {
        include: [{ association: 'assignedCategories', attributes: ['id'] }],
      });
      const allowedCats = (fullUser.assignedCategories || []).map((c) => c.id.toString());
      const children = await Category.findAll({
        where: { parentId: { [Op.in]: allowedCats.map(Number) } },
        attributes: ['id'],
      });
      for (const c of children) allowedCats.push(c.id.toString());
      if (!data.categoryId || !allowedCats.includes(data.categoryId.toString())) {
        return res.status(403).json({ message: 'You can only add products to your assigned categories.' });
      }
    }

    // Extract colors before creating product
    const colors = data.colors || [];
    delete data.colors;

    const product = await Product.create(data);

    // Create colors
    if (colors.length) {
      await ProductColor.bulkCreate(
        colors.map((c) => ({ ...c, productId: product.id }))
      );
    }

    // For shop managers, add this product to their assigned products
    if (req.user.role === 'shopmanager') {
      const fullUser = await User.findByPk(req.user.id);
      await fullUser.addAssignedProduct(product);
    }

    // Reload with associations
    const result = await Product.findByPk(product.id, {
      include: [
        { association: 'category', attributes: ['id', 'name', 'slug'] },
        { association: 'colors', attributes: ['name', 'hex', 'image'] },
      ],
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res, next) {
  try {
    const Product = getProductModel();
    const ProductColor = getProductColor();
    const Category = getCategory();
    const User = getUser();

    const data = { ...req.body };

    // Shop manager scope check.
    if (req.user.role === 'shopmanager') {
      const allowed = await canManageProduct(req.user, req.params.id);
      if (!allowed) return res.status(403).json({ message: 'You do not have access to this product.' });

      if (data.category || data.categoryId) {
        const catId = data.category || data.categoryId;
        const fullUser = await User.findByPk(req.user.id, {
          include: [{ association: 'assignedCategories', attributes: ['id'] }],
        });
        const allowedCats = (fullUser.assignedCategories || []).map((c) => c.id.toString());
        const children = await Category.findAll({
          where: { parentId: { [Op.in]: allowedCats.map(Number) } },
          attributes: ['id'],
        });
        for (const c of children) allowedCats.push(c.id.toString());
        if (!allowedCats.includes(catId.toString())) {
          return res.status(403).json({ message: 'You cannot assign a product to a category you do not manage.' });
        }
      }
    }

    // Handle category field -> categoryId
    if (data.category && !data.categoryId) {
      data.categoryId = data.category;
      delete data.category;
    }

    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.slug) data.slug = slugify(data.slug);
    if (data.description !== undefined) data.description = sanitizeHtml(data.description);

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Handle colors update
    if (data.colors !== undefined) {
      await ProductColor.destroy({ where: { productId: product.id } });
      if (data.colors.length) {
        await ProductColor.bulkCreate(
          data.colors.map((c) => ({ ...c, productId: product.id }))
        );
      }
      delete data.colors;
    }

    await product.update(data);

    // Reload with associations
    const result = await Product.findByPk(product.id, {
      include: [
        { association: 'category', attributes: ['id', 'name', 'slug'] },
        { association: 'colors', attributes: ['name', 'hex', 'image'] },
      ],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res, next) {
  try {
    const Product = getProductModel();
    const Review = getReview();

    // Shop manager scope check.
    if (req.user.role === 'shopmanager') {
      const allowed = await canManageProduct(req.user, req.params.id);
      if (!allowed) return res.status(403).json({ message: 'You do not have access to this product.' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await Review.destroy({ where: { productId: product.id } });
    await product.destroy();
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
}
