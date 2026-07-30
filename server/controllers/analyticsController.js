import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// GET /api/analytics/overview  (admin)
export async function overview(req, res, next) {
  try {
    const [orders, revenueAgg, customers, products, lowStock] = await Promise.all([
      Order.countDocuments({ status: { $ne: 'cancelled' } }),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      User.countDocuments({ role: 'client' }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
    ]);

    const pending = await Order.countDocuments({ status: 'pending' });

    res.json({
      totalRevenue: revenueAgg[0]?.total || 0,
      totalOrders: orders,
      totalCustomers: customers,
      totalProducts: products,
      lowStockCount: lowStock,
      pendingOrders: pending,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/sales?days=30  (revenue + order count per day)
export async function salesTrend(req, res, next) {
  try {
    const days = Math.min(180, Number(req.query.days) || 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })));
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/top-products  (best sellers)
export async function topProducts(req, res, next) {
  try {
    const items = await Product.find({ unitsSold: { $gt: 0 } })
      .sort({ unitsSold: -1 })
      .limit(10)
      .populate('category', 'name')
      .select('name unitsSold price stock images category rating');
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/by-category  (revenue share by category)
export async function revenueByCategory(req, res, next) {
  try {
    const data = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'prod',
        },
      },
      { $unwind: '$prod' },
      {
        $lookup: {
          from: 'categories',
          localField: 'prod.category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: '$cat' },
      {
        $group: {
          _id: '$cat.name',
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          units: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json(data.map((d) => ({ category: d._id, revenue: d.revenue, units: d.units })));
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/recommendations
// Simple, explainable heuristics the client can act on next time.
export async function recommendations(req, res, next) {
  try {
    const [restock, promote, slowMovers] = await Promise.all([
      // Selling well but low on stock -> restock
      Product.find({ isActive: true, unitsSold: { $gte: 5 }, stock: { $lte: 5 } })
        .sort({ unitsSold: -1 })
        .limit(6)
        .select('name stock unitsSold price images'),
      // Best sellers with healthy stock -> feature/promote
      Product.find({ isActive: true, unitsSold: { $gte: 10 }, stock: { $gt: 5 } })
        .sort({ unitsSold: -1 })
        .limit(6)
        .select('name stock unitsSold price images'),
      // In catalogue a while, barely sold -> discount / bundle
      Product.find({ isActive: true, unitsSold: { $lte: 2 } })
        .sort({ createdAt: 1 })
        .limit(6)
        .select('name stock unitsSold price images createdAt'),
    ]);

    res.json({
      restock: restock.map((p) => ({
        ...p.toObject(),
        reason: `Sold ${p.unitsSold} units but only ${p.stock} left — restock soon.`,
      })),
      promote: promote.map((p) => ({
        ...p.toObject(),
        reason: `Strong seller (${p.unitsSold} sold) — feature it on the homepage.`,
      })),
      slowMovers: slowMovers.map((p) => ({
        ...p.toObject(),
        reason: `Only ${p.unitsSold} sold — consider a discount or bundle.`,
      })),
    });
  } catch (err) {
    next(err);
  }
}
