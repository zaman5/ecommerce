import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { scopedProductIds } from '../middleware/auth.js';
import mongoose from 'mongoose';

// GET /api/analytics/overview  (admin / shop-manager)
export async function overview(req, res, next) {
  try {
    const ids = await scopedProductIds(req.user);

    // When scoped, only count products and orders in scope.
    const productFilter = ids
      ? { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }
      : {};
    const scopedProductFilter = ids
      ? { isActive: true, _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }
      : { isActive: true };

    const orderMatch = { status: { $ne: 'cancelled' } };
    if (ids) orderMatch['items.product'] = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };

    const revenueAggregation = ids
      ? [
          { $match: { status: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          { $match: { 'items.product': { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
        ]
      : [
          { $match: orderMatch },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ];

    const [orders, revenueAgg, customers, products, lowStock] = await Promise.all([
      Order.countDocuments(orderMatch),
      Order.aggregate(revenueAggregation),
      ids ? Promise.resolve(0) : User.countDocuments({ role: 'client' }),
      Product.countDocuments(scopedProductFilter),
      Product.countDocuments({ ...scopedProductFilter, stock: { $lte: 5 } }),
    ]);

    const pendingMatch = { status: 'pending' };
    if (ids) pendingMatch['items.product'] = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
    const pending = await Order.countDocuments(pendingMatch);

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

    const ids = await scopedProductIds(req.user);

    let data;
    if (ids) {
      const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
      data = await Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $match: { 'items.product': { $in: objectIds } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            ordersSet: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            _id: 1,
            revenue: 1,
            orders: { $size: '$ordersSet' },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else {
      data = await Order.aggregate([
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
    }

    res.json(data.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })));
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/top-products  (best sellers)
export async function topProducts(req, res, next) {
  try {
    const ids = await scopedProductIds(req.user);
    const filter = { unitsSold: { $gt: 0 } };
    if (ids) filter._id = { $in: ids };

    const items = await Product.find(filter)
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
    const ids = await scopedProductIds(req.user);
    const orderMatch = { status: { $ne: 'cancelled' } };

    const pipeline = [
      { $match: orderMatch },
      { $unwind: '$items' },
    ];

    // Scope to the shop manager's products.
    if (ids) {
      pipeline.push({ $match: { 'items.product': { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } });
    }

    pipeline.push(
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
      { $sort: { revenue: -1 } }
    );

    const data = await Order.aggregate(pipeline);
    res.json(data.map((d) => ({ category: d._id, revenue: d.revenue, units: d.units })));
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/recommendations
export async function recommendations(req, res, next) {
  try {
    const ids = await scopedProductIds(req.user);
    const base = { isActive: true };
    if (ids) base._id = { $in: ids };

    const [restock, promote, slowMovers] = await Promise.all([
      Product.find({ ...base, unitsSold: { $gte: 5 }, stock: { $lte: 5 } })
        .sort({ unitsSold: -1 })
        .limit(6)
        .select('name stock unitsSold price images'),
      Product.find({ ...base, unitsSold: { $gte: 10 }, stock: { $gt: 5 } })
        .sort({ unitsSold: -1 })
        .limit(6)
        .select('name stock unitsSold price images'),
      Product.find({ ...base, unitsSold: { $lte: 2 } })
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

