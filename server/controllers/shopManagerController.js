import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { isValidEmail } from '../utils/email.js';

// POST /api/shop-managers  (admin creates a shop manager account)
export async function createShopManager(req, res, next) {
  try {
    const { name, email, password, phone, assignedCategories, assignedProducts } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if ((!assignedCategories || !assignedCategories.length) && (!assignedProducts || !assignedProducts.length)) {
      return res.status(400).json({ message: 'Assign at least one category or product to this shop manager.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = new User({
      name,
      email,
      phone: phone || '',
      role: 'shopmanager',
      assignedCategories: assignedCategories || [],
      assignedProducts: assignedProducts || [],
      isActive: true,
    });
    await user.setPassword(password);
    await user.save();

    res.status(201).json(user.toSafeJSON());
  } catch (err) {
    next(err);
  }
}

// GET /api/shop-managers  (admin lists all shop managers)
export async function listShopManagers(req, res, next) {
  try {
    const managers = await User.find({ role: 'shopmanager' })
      .populate('assignedCategories', 'name slug')
      .populate('assignedProducts', 'name slug images')
      .sort({ createdAt: -1 });

    res.json(managers.map((m) => ({
      id: m._id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      role: m.role,
      assignedCategories: m.assignedCategories,
      assignedProducts: m.assignedProducts,
      isActive: m.isActive,
      createdAt: m.createdAt,
    })));
  } catch (err) {
    next(err);
  }
}

// GET /api/shop-managers/:id  (admin views one shop manager)
export async function getShopManager(req, res, next) {
  try {
    const manager = await User.findOne({ _id: req.params.id, role: 'shopmanager' })
      .populate('assignedCategories', 'name slug')
      .populate('assignedProducts', 'name slug images');
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });

    res.json({
      id: manager._id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      role: manager.role,
      assignedCategories: manager.assignedCategories,
      assignedProducts: manager.assignedProducts,
      isActive: manager.isActive,
      createdAt: manager.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/shop-managers/:id  (admin updates scope, status, or password)
export async function updateShopManager(req, res, next) {
  try {
    const manager = await User.findOne({ _id: req.params.id, role: 'shopmanager' });
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });

    const { name, phone, password, assignedCategories, assignedProducts, isActive } = req.body;
    if (name) manager.name = name;
    if (phone !== undefined) manager.phone = phone;
    if (assignedCategories !== undefined) manager.assignedCategories = assignedCategories;
    if (assignedProducts !== undefined) manager.assignedProducts = assignedProducts;
    if (isActive !== undefined) manager.isActive = isActive;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      await manager.setPassword(password);
    }

    await manager.save();

    // Re-populate for the response.
    await manager.populate('assignedCategories', 'name slug');
    await manager.populate('assignedProducts', 'name slug images');

    res.json({
      id: manager._id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      role: manager.role,
      assignedCategories: manager.assignedCategories,
      assignedProducts: manager.assignedProducts,
      isActive: manager.isActive,
      createdAt: manager.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/shop-managers/:id  (admin removes a shop manager)
export async function deleteShopManager(req, res, next) {
  try {
    const manager = await User.findOneAndDelete({ _id: req.params.id, role: 'shopmanager' });
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });
    res.json({ message: 'Shop manager deleted.' });
  } catch (err) {
    next(err);
  }
}
