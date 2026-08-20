import crypto from 'crypto';
import { getOrder as getOrderModel, getOrderItem, getOrderTracking } from '../models/Order.js';
import { getProduct } from '../models/Product.js';
import { getUser } from '../models/User.js';
import { sendOrderConfirmation, sendOrderDispatched, sendOrderDelivered } from '../utils/emailService.js';
import { scopedProductIds } from '../middleware/auth.js';
import { isValidEmail } from '../utils/email.js';
import { Op } from 'sequelize';

const SHIPPING_FEE = 250; // flat PKR shipping

function validateAddress(address) {
  if (!address) return 'Please provide a complete shipping address.';
  if (!address.fullName?.trim()) return 'Please enter your full name.';
  if (!address.line1?.trim()) return 'Please enter your delivery address.';
  if (!address.city?.trim()) return 'Please enter your city.';
  if (!address.phone?.trim()) return 'Please enter a phone number so we can reach you.';
  return null;
}

function newGuestToken() {
  return crypto.randomBytes(24).toString('hex');
}

function canAccess(order, req) {
  if (req.user) {
    if (req.user.role === 'admin') return true;
    const ownerId = order.userId || (order.user?.id);
    if (ownerId && String(ownerId) === String(req.user.id)) return true;
  }
  const token = req.query.token || req.body?.token;
  return !!(token && order.guestToken && token === order.guestToken);
}

// POST /api/orders
export async function placeOrder(req, res, next) {
  try {
    const Order = getOrderModel();
    const OrderItem = getOrderItem();
    const OrderTracking = getOrderTracking();
    const Product = getProduct();

    const { items, shippingAddress, paymentMethod, email, paymentScreenshot } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Your cart is empty.' });

    const addressError = validateAddress(shippingAddress);
    if (addressError) return res.status(400).json({ message: addressError });

    const isGuest = !req.user;
    const guestEmail = (email || '').trim().toLowerCase();
    if (isGuest && !isValidEmail(guestEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email so we can send your order confirmation.' });
    }

    const orderItems = [];
    let itemsTotal = 0;
    const claimed = new Map();

    for (const line of items) {
      const qty = Math.max(1, Number(line.qty) || 1);
      const product = await Product.findByPk(line.product, {
        include: [{ association: 'colors' }],
      });
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A product in your cart is no longer available.` });
      }
      const key = String(product.id);
      const totalWanted = (claimed.get(key) || 0) + qty;
      if (product.stock < totalWanted) {
        return res.status(400).json({ message: `Only ${product.stock} left of "${product.name}".` });
      }
      claimed.set(key, totalWanted);

      let color = '';
      if (product.colors?.length) {
        const wanted = (line.color || '').trim();
        const match = product.colors.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
        if (!match) {
          return res.status(400).json({ message: `Please choose a colour for "${product.name}".` });
        }
        color = match.name;
      }

      orderItems.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: Array.isArray(product.images) ? product.images[0] || '' : '',
        color,
        price: product.price,
        qty,
      });
      itemsTotal += product.price * qty;
    }

    const grandTotal = itemsTotal + SHIPPING_FEE;
    const guestToken = isGuest ? newGuestToken() : '';

    const order = await Order.create({
      userId: req.user?.id || null,
      isGuest,
      guestEmail: isGuest ? guestEmail : req.user.email,
      guestToken,
      shippingFullName: shippingAddress.fullName?.trim() || '',
      shippingLine1: shippingAddress.line1?.trim() || '',
      shippingCity: shippingAddress.city?.trim() || '',
      shippingProvince: shippingAddress.province?.trim() || '',
      shippingPostalCode: shippingAddress.postalCode?.trim() || '',
      shippingPhone: shippingAddress.phone?.trim() || '',
      itemsTotal,
      shippingFee: SHIPPING_FEE,
      grandTotal,
      paymentMethod: paymentMethod || 'cod',
      paymentScreenshot: paymentMethod === 'jazzcash' ? (paymentScreenshot || '') : '',
      status: 'pending',
    });

    // Create order items
    await OrderItem.bulkCreate(
      orderItems.map((item) => ({ ...item, orderId: order.id }))
    );

    // Create initial tracking
    await OrderTracking.create({
      orderId: order.id,
      status: 'pending',
      note: 'Order placed successfully.',
      at: new Date(),
    });

    // Decrement stock and increment unitsSold
    for (const line of orderItems) {
      const p = await Product.findByPk(line.productId);
      if (p) {
        await p.decrement('stock', { by: line.qty });
        await p.increment('unitsSold', { by: line.qty });
      }
    }

    // Reload order with items and tracking
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { association: 'items' },
        { association: 'tracking' },
        { association: 'user', attributes: ['name', 'email'] },
      ],
    });

    // Trigger order confirmation email in background
    sendOrderConfirmation(fullOrder).catch((err) => {
      console.error('Failed to send order confirmation email:', err.message);
    });

    const body = fullOrder.toJSON();
    if (isGuest) {
      body.guestToken = guestToken;
    }
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/mine
export async function myOrders(req, res, next) {
  try {
    const Order = getOrderModel();
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [
        { association: 'items' },
        { association: 'tracking' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id?token=…
export async function getOrderById(req, res, next) {
  try {
    const Order = getOrderModel();
    const order = await Order.findByPk(req.params.id, {
      include: [
        { association: 'items' },
        { association: 'tracking' },
        { association: 'user', attributes: ['name', 'email'] },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!canAccess(order, req)) {
      return res.status(403).json({ message: 'Not allowed to view this order.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
}
export const getOrder = getOrderById;

// PUT /api/orders/:id/cancel
export async function cancelOrder(req, res, next) {
  try {
    const Order = getOrderModel();
    const OrderTracking = getOrderTracking();
    const Product = getProduct();

    const order = await Order.findByPk(req.params.id, {
      include: [{ association: 'items' }, { association: 'tracking' }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccess(order, req)) {
      return res.status(403).json({ message: 'Not allowed.' });
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'This order can no longer be cancelled.' });
    }

    order.status = 'cancelled';
    await order.save();

    await OrderTracking.create({
      orderId: order.id,
      status: 'cancelled',
      note: 'Cancelled by customer.',
      at: new Date(),
    });

    // Return stock
    for (const line of order.items) {
      const p = await Product.findByPk(line.productId);
      if (p) {
        await p.increment('stock', { by: line.qty });
        await p.decrement('unitsSold', { by: line.qty });
      }
    }

    const updated = await Order.findByPk(order.id, {
      include: [{ association: 'items' }, { association: 'tracking' }],
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/lookup
export async function lookupOrder(req, res, next) {
  try {
    const Order = getOrderModel();
    const orderNumber = (req.body.orderNumber || '').trim().toUpperCase();
    const email = (req.body.email || '').trim().toLowerCase();
    if (!orderNumber || !email) {
      return res.status(400).json({ message: 'Please enter your order number and email.' });
    }

    const order = await Order.findOne({
      where: { orderNumber, guestEmail: email },
    });
    if (!order) {
      return res.status(404).json({ message: 'We could not find an order with those details.' });
    }

    res.json({
      id: String(order.id),
      _id: String(order.id),
      orderNumber: order.orderNumber,
      token: order.guestToken || '',
    });
  } catch (err) {
    next(err);
  }
}

// ---- Admin ----

// GET /api/orders
export async function adminListOrders(req, res, next) {
  try {
    const Order = getOrderModel();
    const OrderItem = getOrderItem();
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const ids = await scopedProductIds(req.user);
    if (ids) {
      const matchingItems = await OrderItem.findAll({
        where: { productId: { [Op.in]: ids.map(Number) } },
        attributes: ['orderId'],
        raw: true,
      });
      const orderIds = [...new Set(matchingItems.map((i) => i.orderId))];
      where.id = { [Op.in]: orderIds };
    }

    const orders = await Order.findAll({
      where,
      include: [
        { association: 'user', attributes: ['name', 'email'] },
        { association: 'items' },
        { association: 'tracking' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/status
export async function updateOrderStatus(req, res, next) {
  try {
    const Order = getOrderModel();
    const OrderTracking = getOrderTracking();
    const Product = getProduct();

    const { status, note, paymentStatus } = req.body;
    const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    const order = await Order.findByPk(req.params.id, {
      include: [{ association: 'items' }, { association: 'tracking' }, { association: 'user', attributes: ['name', 'email'] }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (req.user.role === 'shopmanager') {
      const ids = await scopedProductIds(req.user);
      const hasItem = order.items.some((line) => ids.includes(String(line.productId)));
      if (!hasItem) {
        return res.status(403).json({ message: 'You do not have permission to manage this order.' });
      }
    }

    if (status) {
      if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

      const wasCancelled = order.status === 'cancelled';
      const nowCancelled = status === 'cancelled';

      if (nowCancelled && !wasCancelled) {
        for (const line of order.items) {
          const p = await Product.findByPk(line.productId);
          if (p) {
            await p.increment('stock', { by: line.qty });
            await p.decrement('unitsSold', { by: line.qty });
          }
        }
      }

      if (wasCancelled && !nowCancelled) {
        const short = [];
        for (const line of order.items) {
          const product = await Product.findByPk(line.productId);
          if (product && product.stock < line.qty) {
            short.push(`${product.name} (${product.stock} left, needs ${line.qty})`);
          }
        }
        if (short.length) {
          return res.status(400).json({
            message: `Not enough stock to reopen this order: ${short.join(', ')}.`,
          });
        }
        for (const line of order.items) {
          const p = await Product.findByPk(line.productId);
          if (p) {
            await p.decrement('stock', { by: line.qty });
            await p.increment('unitsSold', { by: line.qty });
          }
        }
      }

      order.status = status;
      await OrderTracking.create({
        orderId: order.id,
        status,
        note: note || '',
        at: new Date(),
      });

      if (status === 'delivered') order.paymentStatus = 'paid';
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    const reloaded = await Order.findByPk(order.id, {
      include: [
        { association: 'items' },
        { association: 'tracking' },
        { association: 'user', attributes: ['name', 'email'] },
      ],
    });

    if (status === 'shipped') {
      sendOrderDispatched(reloaded).catch((err) => {
        console.error('Failed to send order dispatched email:', err.message);
      });
    } else if (status === 'delivered') {
      sendOrderDelivered(reloaded).catch((err) => {
        console.error('Failed to send order delivered email:', err.message);
      });
    }

    res.json(reloaded);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/verify-payment
export async function verifyPayment(req, res, next) {
  try {
    const Order = getOrderModel();
    const OrderTracking = getOrderTracking();

    const order = await Order.findByPk(req.params.id, {
      include: [{ association: 'items' }, { association: 'tracking' }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (req.user.role === 'shopmanager') {
      const ids = await scopedProductIds(req.user);
      const hasItem = order.items.some((line) => ids.includes(String(line.productId)));
      if (!hasItem) {
        return res.status(403).json({ message: 'You do not have permission to manage this order.' });
      }
    }

    if (!order.paymentScreenshot) {
      return res.status(400).json({ message: 'No payment screenshot was submitted for this order.' });
    }

    order.paymentStatus = 'paid';
    await order.save();

    await OrderTracking.create({
      orderId: order.id,
      status: order.status,
      note: 'Payment verified by admin.',
      at: new Date(),
    });

    const reloaded = await Order.findByPk(order.id, {
      include: [{ association: 'items' }, { association: 'tracking' }],
    });
    res.json(reloaded);
  } catch (err) {
    next(err);
  }
}
