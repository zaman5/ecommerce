import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// Attaches req.user if a valid Bearer token is present
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized. Please log in.' });

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
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
// present and simply moves on when it isn't. Used by routes that serve both
// signed-in customers and guests (e.g. placing or viewing an order).
export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
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
 * The scope is the union of:
 *   • every product filed under one of their assigned categories (including
 *     sub-categories of those categories), and
 *   • every individually assigned product.
 *
 * Admins get `null`, meaning "no restriction".
 */
export async function scopedProductIds(user) {
  if (user.role === 'admin') return null; // unrestricted
  if (user.role !== 'shopmanager') return []; // clients can't manage anything

  const catIds = user.assignedCategories || [];
  const prodIds = (user.assignedProducts || []).map((id) => id.toString());

  if (catIds.length) {
    // Include sub-categories of the assigned departments, so assigning
    // "Electronics" also covers "Phones" and "Laptops" beneath it.
    const children = await Category.find({ parent: { $in: catIds } }).select('_id');
    const allCatIds = [...catIds.map((id) => id.toString()), ...children.map((c) => c._id.toString())];
    const catProducts = await Product.find({ category: { $in: allCatIds } }).select('_id');
    for (const p of catProducts) {
      if (!prodIds.includes(p._id.toString())) prodIds.push(p._id.toString());
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

