import { getOrder, getOrderItem } from '../models/Order.js';
import { getProduct } from '../models/Product.js';
import { getUser } from '../models/User.js';
import { getCategory } from '../models/Category.js';
import { scopedProductIds } from '../middleware/auth.js';
import { Op, fn, col, literal } from 'sequelize';

// GET /api/analytics/overview
export async function overview(req, res, next) {
  try {
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const Product = getProduct();
    const User = getUser();

    const ids = await scopedProductIds(req.user);

    const scopedProductFilter = ids
      ? { isActive: true, id: { [Op.in]: ids.map(Number) } }
      : { isActive: true };

    const orderMatch = { status: { [Op.ne]: 'cancelled' } };

    let totalRevenue = 0;
    let orders = 0;
    let pending = 0;

    if (ids) {
      const orderItems = await OrderItem.findAll({
        where: { productId: { [Op.in]: ids.map(Number) } },
        include: [
          {
            association: 'Order',
            where: orderMatch,
            attributes: ['id', 'status'],
          },
        ],
        raw: true,
      });

      const uniqueOrderIds = new Set(orderItems.map((i) => i['Order.id']));
      orders = uniqueOrderIds.size;
      totalRevenue = orderItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.qty || 1), 0);

      const pendingOrderItems = await OrderItem.findAll({
        where: { productId: { [Op.in]: ids.map(Number) } },
        include: [
          {
            association: 'Order',
            where: { status: 'pending' },
            attributes: ['id'],
          },
        ],
        raw: true,
      });
      pending = new Set(pendingOrderItems.map((i) => i['Order.id'])).size;
    } else {
      orders = await Order.count({ where: orderMatch });
      const revRes = await Order.findAll({
        where: orderMatch,
        attributes: [[fn('SUM', col('grand_total')), 'total']],
        raw: true,
      });
      totalRevenue = parseFloat(revRes[0]?.total) || 0;
      pending = await Order.count({ where: { status: 'pending' } });
    }

    const customers = ids ? 0 : await User.count({ where: { role: 'client' } });
    const products = await Product.count({ where: scopedProductFilter });
    const lowStock = await Product.count({
      where: { ...scopedProductFilter, stock: { [Op.lte]: 5 } },
    });

    res.json({
      totalRevenue,
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

// GET /api/analytics/sales?days=30
export async function salesTrend(req, res, next) {
  try {
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const days = Math.min(180, Number(req.query.days) || 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const ids = await scopedProductIds(req.user);

    let result = [];
    if (ids) {
      const orderItems = await OrderItem.findAll({
        where: { productId: { [Op.in]: ids.map(Number) } },
        include: [
          {
            association: 'Order',
            where: { createdAt: { [Op.gte]: since }, status: { [Op.ne]: 'cancelled' } },
            attributes: ['id', 'createdAt'],
          },
        ],
        raw: true,
      });

      const dayMap = new Map();
      for (const item of orderItems) {
        const d = new Date(item['Order.createdAt']).toISOString().slice(0, 10);
        if (!dayMap.has(d)) dayMap.set(d, { orders: new Set(), revenue: 0 });
        const entry = dayMap.get(d);
        entry.orders.add(item['Order.id']);
        entry.revenue += (parseFloat(item.price) || 0) * (item.qty || 1);
      }

      result = Array.from(dayMap.entries())
        .map(([date, data]) => ({ date, revenue: data.revenue, orders: data.orders.size }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const data = await Order.findAll({
        where: { createdAt: { [Op.gte]: since }, status: { [Op.ne]: 'cancelled' } },
        attributes: [
          [fn('DATE_FORMAT', col('created_at'), '%Y-%m-%d'), 'date'],
          [fn('SUM', col('grand_total')), 'revenue'],
          [fn('COUNT', col('id')), 'orders'],
        ],
        group: [fn('DATE_FORMAT', col('created_at'), '%Y-%m-%d')],
        order: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m-%d'), 'ASC']],
        raw: true,
      });

      result = data.map((d) => ({
        date: d.date,
        revenue: parseFloat(d.revenue) || 0,
        orders: parseInt(d.orders) || 0,
      }));
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/top-products
export async function topProducts(req, res, next) {
  try {
    const Product = getProduct();
    const ids = await scopedProductIds(req.user);
    const where = { unitsSold: { [Op.gt]: 0 } };
    if (ids) where.id = { [Op.in]: ids.map(Number) };

    const items = await Product.findAll({
      where,
      order: [['unitsSold', 'DESC']],
      limit: 10,
      include: [{ association: 'category', attributes: ['name'] }],
      attributes: ['id', 'name', 'unitsSold', 'price', 'stock', 'images', 'categoryId', 'rating'],
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/by-category
export async function revenueByCategory(req, res, next) {
  try {
    const Product = getProduct();
    const OrderItem = getOrderItem();
    const Category = getCategory();
    const ids = await scopedProductIds(req.user);

    const itemWhere = {};
    if (ids) itemWhere.productId = { [Op.in]: ids.map(Number) };

    const items = await OrderItem.findAll({
      where: itemWhere,
      include: [
        {
          association: 'Order',
          where: { status: { [Op.ne]: 'cancelled' } },
          attributes: ['id'],
        },
        {
          model: Product,
          attributes: ['categoryId'],
          include: [{ model: Category, as: 'category', attributes: ['name'] }],
        },
      ],
    });

    const catMap = new Map();
    for (const item of items) {
      const catName = item.Product?.category?.name || 'Uncategorized';
      if (!catMap.has(catName)) catMap.set(catName, { revenue: 0, units: 0 });
      const entry = catMap.get(catName);
      entry.revenue += (parseFloat(item.price) || 0) * (item.qty || 1);
      entry.units += item.qty || 1;
    }

    const data = Array.from(catMap.entries())
      .map(([category, stats]) => ({ category, revenue: stats.revenue, units: stats.units }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/recommendations
export async function recommendations(req, res, next) {
  try {
    const Product = getProduct();
    const ids = await scopedProductIds(req.user);
    const base = { isActive: true };
    if (ids) base.id = { [Op.in]: ids.map(Number) };

    const [restock, promote, slowMovers] = await Promise.all([
      Product.findAll({
        where: { ...base, unitsSold: { [Op.gte]: 5 }, stock: { [Op.lte]: 5 } },
        order: [['unitsSold', 'DESC']],
        limit: 6,
        attributes: ['id', 'name', 'stock', 'unitsSold', 'price', 'images'],
      }),
      Product.findAll({
        where: { ...base, unitsSold: { [Op.gte]: 10 }, stock: { [Op.gt]: 5 } },
        order: [['unitsSold', 'DESC']],
        limit: 6,
        attributes: ['id', 'name', 'stock', 'unitsSold', 'price', 'images'],
      }),
      Product.findAll({
        where: { ...base, unitsSold: { [Op.lte]: 2 } },
        order: [['createdAt', 'ASC']],
        limit: 6,
        attributes: ['id', 'name', 'stock', 'unitsSold', 'price', 'images', 'createdAt'],
      }),
    ]);

    res.json({
      restock: restock.map((p) => ({
        ...p.toJSON(),
        reason: `Sold ${p.unitsSold} units but only ${p.stock} left — restock soon.`,
      })),
      promote: promote.map((p) => ({
        ...p.toJSON(),
        reason: `Strong seller (${p.unitsSold} sold) — feature it on the homepage.`,
      })),
      slowMovers: slowMovers.map((p) => ({
        ...p.toJSON(),
        reason: `Only ${p.unitsSold} sold — consider a discount or bundle.`,
      })),
    });
  } catch (err) {
    next(err);
  }
}
