import { verifyToken } from '../utils/token.js';
import { getUser } from '../models/User.js';
import { getProduct } from '../models/Product.js';
import { getCategory } from '../models/Category.js';
import { Op } from 'sequelize';

// Attaches req.user if a valid Bearer token is present
export async function protect(req, res, next) {
  try {
    const User = getUser();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized. Please log in.' });

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

    // A disabled shop manager cannot use the system even if their token is valid.
    if (user.role === 'shopmanager' && !user.isActive) {
      return res.status(403).json({ message: 'Your account has been disabled. Contact the admin.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
}

// Like `protect`, but never rejects: attaches req.user when a valid token is
// present and simply moves on when it isn't.
export async function optionalAuth(req, res, next) {
  try {
    const User = getUser();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.id);
      if (user) req.user = user;
    }
  } catch {
    // An expired or malformed token just means "treat this as a guest".
  }
  next();
}

// Restricts a route to given roles, e.g. adminOnly = restrictTo('admin')
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
}

// ---------- shop-manager scope helpers ----------

/**
 * All product IDs a shop manager is authorised to touch.
 *
 * Admins get `null`, meaning "no restriction".
 */
export async function scopedProductIds(user) {
  const Product = getProduct();
  const Category = getCategory();

  if (user.role === 'admin') return null; // unrestricted
  if (user.role !== 'shopmanager') return []; // clients can't manage anything

  // Load assigned categories and products for this user
  const fullUser = await getUser().findByPk(user.id, {
    include: [
      { association: 'assignedCategories', attributes: ['id'] },
      { association: 'assignedProducts', attributes: ['id'] },
    ],
  });

  const catIds = (fullUser.assignedCategories || []).map((c) => c.id);
  const prodIds = (fullUser.assignedProducts || []).map((p) => p.id.toString());

  if (catIds.length) {
    // Include sub-categories of the assigned departments
    const children = await Category.findAll({
      where: { parentId: { [Op.in]: catIds } },
      attributes: ['id'],
    });
    const allCatIds = [...catIds, ...children.map((c) => c.id)];
    const catProducts = await Product.findAll({
      where: { categoryId: { [Op.in]: allCatIds } },
      attributes: ['id'],
    });
    for (const p of catProducts) {
      if (!prodIds.includes(p.id.toString())) prodIds.push(p.id.toString());
    }
  }

  return prodIds;
}

/**
 * True when `user` may touch `productId`.
 */
export async function canManageProduct(user, productId) {
  if (user.role === 'admin') return true;
  const ids = await scopedProductIds(user);
  return ids.includes(productId.toString());
}
