import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const SHIPPING_FEE = 250; // flat PKR shipping; adjust as needed

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Everything a delivery actually needs. Province and postal code are optional
// on purpose — guest checkout only asks for what's required.
function validateAddress(address) {
  if (!address) return 'Please provide a complete shipping address.';
  if (!address.fullName?.trim()) return 'Please enter your full name.';
  if (!address.line1?.trim()) return 'Please enter your delivery address.';
  if (!address.city?.trim()) return 'Please enter your city.';
  if (!address.phone?.trim()) return 'Please enter a phone number so we can reach you.';
  return null;
}

// A guest proves ownership of their order with this token instead of a login.
function newGuestToken() {
  return crypto.randomBytes(24).toString('hex');
}

// True when the requester may see/act on this order: the owner, an admin, or a
// guest presenting the matching token.
function canAccess(order, req) {
  if (req.user) {
    if (req.user.role === 'admin') return true;
    // `user` may be populated or a raw ObjectId depending on the caller.
    const ownerId = order.user?._id || order.user;
    if (ownerId && ownerId.toString() === req.user._id.toString()) return true;
    // A logged-in user may still open a guest order they hold the token for.
  }
  const token = req.query.token || req.body?.token;
  return !!(token && order.guestToken && token === order.guestToken);
}

// POST /api/orders
// Works signed-in *or* as a guest (optionalAuth): guests must supply an email
// so they get a confirmation and a tracking link.
export async function placeOrder(req, res, next) {
  try {
    const { items, shippingAddress, paymentMethod, email } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Your cart is empty.' });

    const addressError = validateAddress(shippingAddress);
    if (addressError) return res.status(400).json({ message: addressError });

    const isGuest = !req.user;
    const guestEmail = (email || '').trim().toLowerCase();
    if (isGuest && !EMAIL_RE.test(guestEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email so we can send your order confirmation.' });
    }

    // Rebuild the order from trusted DB prices (never trust client-sent prices)
    const orderItems = [];
    let itemsTotal = 0;

    for (const line of items) {
      const qty = Math.max(1, Number(line.qty) || 1);
      const product = await Product.findById(line.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A product in your cart is no longer available.` });
      }
      if (product.stock < qty) {
        return res.status(400).json({ message: `Only ${product.stock} left of "${product.name}".` });
      }
      orderItems.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || '',
        price: product.price,
        qty,
      });
      itemsTotal += product.price * qty;
    }

    const grandTotal = itemsTotal + SHIPPING_FEE;
    const guestToken = isGuest ? newGuestToken() : '';

    const order = await Order.create({
      user: req.user?._id || null,
      isGuest,
      guestEmail: isGuest ? guestEmail : req.user.email,
      guestToken,
      items: orderItems,
      shippingAddress,
      itemsTotal,
      shippingFee: SHIPPING_FEE,
      grandTotal,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      tracking: [{ status: 'pending', note: 'Order placed successfully.', at: new Date() }],
    });

    // Decrement stock and increment sales counters (for analytics)
    for (const line of orderItems) {
      await Product.findByIdAndUpdate(line.product, {
        $inc: { stock: -line.qty, unitsSold: line.qty },
      });
    }

    // The token is returned exactly once — the browser stores it so the guest
    // can reopen this order later.
    const body = order.toObject();
    delete body.guestToken;
    res.status(201).json(isGuest ? { ...body, guestToken } : body);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/mine
export async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id?token=…  (owner, admin, or a guest with the token)
export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .select('+guestToken')
      .populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (!canAccess(order, req)) {
      return res.status(403).json({ message: 'Not allowed to view this order.' });
    }

    const body = order.toObject();
    delete body.guestToken;
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/cancel  (client cancels while still pending/confirmed)
export async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).select('+guestToken');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccess(order, req)) {
      return res.status(403).json({ message: 'Not allowed.' });
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'This order can no longer be cancelled.' });
    }
    order.status = 'cancelled';
    order.tracking.push({ status: 'cancelled', note: 'Cancelled by customer.', at: new Date() });
    // return stock
    for (const line of order.items) {
      await Product.findByIdAndUpdate(line.product, { $inc: { stock: line.qty, unitsSold: -line.qty } });
    }
    await order.save();

    const body = order.toObject();
    delete body.guestToken;
    res.json(body);
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/lookup  (guest order tracking: order number + email)
// Returns the order id + token so the client can open the normal tracking page.
export async function lookupOrder(req, res, next) {
  try {
    const orderNumber = (req.body.orderNumber || '').trim().toUpperCase();
    const email = (req.body.email || '').trim().toLowerCase();
    if (!orderNumber || !email) {
      return res.status(400).json({ message: 'Please enter your order number and email.' });
    }

    const order = await Order.findOne({ orderNumber, guestEmail: email }).select('+guestToken');
    // Deliberately vague: don't reveal whether the number or the email was wrong.
    if (!order) {
      return res.status(404).json({ message: 'We could not find an order with those details.' });
    }

    res.json({ id: order._id, orderNumber: order.orderNumber, token: order.guestToken || '' });
  } catch (err) {
    next(err);
  }
}

// ---- Admin ----

// GET /api/orders  (admin, all orders)
export async function adminListOrders(req, res, next) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/status  (admin updates status -> appends to tracking)
export async function updateOrderStatus(req, res, next) {
  try {
    const { status, note, paymentStatus } = req.body;
    const allowed = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (status) {
      if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

      // Cancelling puts the goods back on the shelf, exactly as a customer-side
      // cancel does. Guarded on the *previous* status so re-saving an already
      // cancelled order can't credit the stock twice.
      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const line of order.items) {
          await Product.findByIdAndUpdate(line.product, {
            $inc: { stock: line.qty, unitsSold: -line.qty },
          });
        }
      }

      order.status = status;
      order.tracking.push({ status, note: note || '', at: new Date() });
      if (status === 'delivered') order.paymentStatus = 'paid';
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
}
