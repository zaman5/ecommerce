import { getUser } from '../models/User.js';
import { getCategory } from '../models/Category.js';
import { getProduct } from '../models/Product.js';
import { isValidEmail } from '../utils/email.js';

// POST /api/shop-managers  (admin creates a shop manager account)
export async function createShopManager(req, res, next) {
  try {
    const User = getUser();
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

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = User.build({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      role: 'shopmanager',
      isActive: true,
    });
    await user.setPassword(password);
    await user.save();

    if (assignedCategories?.length) {
      await user.setAssignedCategories(assignedCategories.map(Number));
    }
    if (assignedProducts?.length) {
      await user.setAssignedProducts(assignedProducts.map(Number));
    }

    const fullUser = await User.findByPk(user.id, {
      include: [
        { association: 'assignedCategories', attributes: ['id', 'name', 'slug'] },
        { association: 'assignedProducts', attributes: ['id', 'name', 'slug', 'images'] },
      ],
    });

    res.status(201).json(fullUser.toSafeJSON());
  } catch (err) {
    next(err);
  }
}

// GET /api/shop-managers  (admin lists all shop managers)
export async function listShopManagers(req, res, next) {
  try {
    const User = getUser();
    const managers = await User.findAll({
      where: { role: 'shopmanager' },
      include: [
        { association: 'assignedCategories', attributes: ['id', 'name', 'slug'] },
        { association: 'assignedProducts', attributes: ['id', 'name', 'slug', 'images'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(managers.map((m) => ({
      id: m.id,
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
    const User = getUser();
    const manager = await User.findOne({
      where: { id: req.params.id, role: 'shopmanager' },
      include: [
        { association: 'assignedCategories', attributes: ['id', 'name', 'slug'] },
        { association: 'assignedProducts', attributes: ['id', 'name', 'slug', 'images'] },
      ],
    });
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });

    res.json({
      id: manager.id,
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
    const User = getUser();
    const manager = await User.findOne({
      where: { id: req.params.id, role: 'shopmanager' },
    });
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });

    const { name, phone, password, assignedCategories, assignedProducts, isActive } = req.body;
    if (name) manager.name = name;
    if (phone !== undefined) manager.phone = phone;
    if (isActive !== undefined) manager.isActive = isActive;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      await manager.setPassword(password);
    }
    await manager.save();

    if (assignedCategories !== undefined) {
      await manager.setAssignedCategories(assignedCategories.map(Number));
    }
    if (assignedProducts !== undefined) {
      await manager.setAssignedProducts(assignedProducts.map(Number));
    }

    const full = await User.findByPk(manager.id, {
      include: [
        { association: 'assignedCategories', attributes: ['id', 'name', 'slug'] },
        { association: 'assignedProducts', attributes: ['id', 'name', 'slug', 'images'] },
      ],
    });

    res.json({
      id: full.id,
      name: full.name,
      email: full.email,
      phone: full.phone,
      role: full.role,
      assignedCategories: full.assignedCategories,
      assignedProducts: full.assignedProducts,
      isActive: full.isActive,
      createdAt: full.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/shop-managers/:id  (admin removes a shop manager)
export async function deleteShopManager(req, res, next) {
  try {
    const User = getUser();
    const manager = await User.findOne({
      where: { id: req.params.id, role: 'shopmanager' },
    });
    if (!manager) return res.status(404).json({ message: 'Shop manager not found.' });
    await manager.destroy();
    res.json({ message: 'Shop manager deleted.' });
  } catch (err) {
    next(err);
  }
}
