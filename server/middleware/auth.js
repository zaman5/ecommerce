import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

// Attaches req.user if a valid Bearer token is present
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authorized. Please log in.' });

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

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
