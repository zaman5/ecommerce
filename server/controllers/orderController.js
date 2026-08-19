import crypto from 'crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendOrderConfirmation, sendOrderDispatched, sendOrderDelivered } from '../utils/emailService.js';
import { scopedProductIds } from '../middleware/auth.js';

const SHIPPING_FEE = 250; // flat PKR shipping; adjust as needed

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
    const { items, shippingAddress, paymentMethod, email, paymentScreenshot } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: 'Your cart is empty.' });

    const addressError = validateAddress(shippingAddress);
    if (addressError) return res.status(400).json({ message: addressError });

    const isGuest = !req.user;
    const guestEmail = (email || '').trim().toLowerCase();
    if (isGuest && !isValidEmail(guestEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email so we can send your order confirmation.' });
    }

    // Rebuild the order from trusted DB prices (never trust client-sent prices)
    const orderItems = [];
    let itemsTotal = 0;
    // Stock is held per product, not per colour, so the same product ordered in
    // two colours arrives as two lines that must be counted against one pool.
    const claimed = new Map();

    for (const line of items) {
      const qty = Math.max(1, Number(line.qty) || 1);
      const product = await Product.findById(line.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A product in your cart is no longer available.` });
      }
      const key = product._id.toString();
      const totalWanted = (claimed.get(key) || 0) + qty;
      if (product.stock < totalWanted) {
        return res.status(400).json({ message: `Only ${product.stock} left of "${product.name}".` });
      }
      claimed.set(key, totalWanted);

      // Colour is resolved against the product exactly like price is — the
      // client may only name one of the colours the product actually offers.
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
        product: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || '',
        color,
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
      paymentScreenshot: paymentMethod === 'jazzcash' ? (paymentScreenshot || '') : '',
      status: 'pending',
      tracking: [{ status: 'pending', note: 'Order placed successfully.', at: new Date() }],
    });

    // Decrement stock and increment sales counters (for analytics)
    for (const line of orderItems) {
      await Product.findByIdAndUpdate(line.product, {
        $inc: { stock: -line.qty, unitsSold: line.qty },
      });
    }

    // Trigger order confirmation email in background
    sendOrderConfirmation(order).catch((err) => {
      console.error('Failed to send order confirmation email:', err.message);
    });

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

// GET /api/orders  (admin/shop-manager, all orders — scoped for shop managers)
export async function adminListOrders(req, res, next) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // Shop managers only see orders that contain at least one of their products.
    const ids = await scopedProductIds(req.user);
    if (ids) {
      filter['items.product'] = { $in: ids };
    }

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

    // Shop managers may only update orders containing products in their assigned scope.
    if (req.user.role === 'shopmanager') {
      const ids = await scopedProductIds(req.user);
      const hasItem = order.items.some((line) => ids.includes(line.product.toString()));
      if (!hasItem) {
        return res.status(403).json({ message: 'You do not have permission to manage this order.' });
      }
    }

    if (status) {
      if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

      const wasCancelled = order.status === 'cancelled';
      const nowCancelled = status === 'cancelled';

      // Cancelling puts the goods back on the shelf, exactly as a customer-side
      // cancel does. Guarded on the *previous* status so re-saving an already
      // cancelled order can't credit the stock twice.
      if (nowCancelled && !wasCancelled) {
        for (const line of order.items) {
          await Product.findByIdAndUpdate(line.product, {
            $inc: { stock: line.qty, unitsSold: -line.qty },
          });
        }
      }

      // Reopening a cancelled order has to take the goods off the shelf again.
      // Without this the credit from cancelling is never undone, so every
      // cancel/reopen cycle invents stock that was already promised to someone
      // — and the shop oversells. Checked before anything is written, so a
      // rejected reopen leaves both the order and the stock untouched.
      if (wasCancelled && !nowCancelled) {
        const short = [];
        for (const line of order.items) {
          const product = await Product.findById(line.product).select('name stock');
          // A product deleted since the order was placed holds no stock to
          // reclaim; the order line keeps its own price/name snapshot.
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
          await Product.findByIdAndUpdate(line.product, {
            $inc: { stock: -line.qty, unitsSold: line.qty },
          });
        }
      }

      order.status = status;
      order.tracking.push({ status, note: note || '', at: new Date() });
      if (status === 'delivered') order.paymentStatus = 'paid';
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // Trigger emails on status change
    if (status === 'shipped') {
      sendOrderDispatched(order).catch((err) => {
        console.error('Failed to send order dispatched email:', err.message);
      });
    } else if (status === 'delivered') {
      sendOrderDelivered(order).catch((err) => {
        console.error('Failed to send order delivered email:', err.message);
      });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/verify-payment  (admin/shop-manager verifies a JazzCash screenshot)
export async function verifyPayment(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Shop managers may only verify orders containing products in their scope.
    if (req.user.role === 'shopmanager') {
      const ids = await scopedProductIds(req.user);
      const hasItem = order.items.some((line) => ids.includes(line.product.toString()));
      if (!hasItem) {
        return res.status(403).json({ message: 'You do not have permission to manage this order.' });
      }
    }

    if (!order.paymentScreenshot) {
      return res.status(400).json({ message: 'No payment screenshot was submitted for this order.' });
    }

    order.paymentStatus = 'paid';
    order.tracking.push({
      status: order.status,
      note: 'Payment verified by admin.',
      at: new Date(),
    });
    await order.save();
    res.json(order);
  } catch (err) {
    next(err);
  }
}
