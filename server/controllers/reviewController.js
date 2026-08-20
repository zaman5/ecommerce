import { getReview } from '../models/Review.js';
import { getProduct } from '../models/Product.js';
import { getOrder, getOrderItem } from '../models/Order.js';
import { canManageProduct } from '../middleware/auth.js';
import { fn, col } from 'sequelize';

// Recalculates a product's average rating + review count from its reviews.
export async function recalcProductRating(productId) {
  const Review = getReview();
  const Product = getProduct();

  const stats = await Review.findAll({
    where: { productId },
    attributes: [
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'numReviews'],
    ],
    raw: true,
  });

  const avg = stats[0]?.avgRating ? Math.round(parseFloat(stats[0].avgRating) * 10) / 10 : 0;
  const count = stats[0]?.numReviews ? parseInt(stats[0].numReviews) : 0;

  const product = await Product.findByPk(productId);
  if (product) {
    await product.update({ rating: avg, numReviews: count });
  }
}

// Has this customer received this product in a delivered order?
async function hasPurchased(userId, productId) {
  const Order = getOrder();
  const OrderItem = getOrderItem();

  const count = await Order.count({
    where: { userId, status: 'delivered' },
    include: [
      {
        association: 'items',
        where: { productId },
      },
    ],
  });
  return count > 0;
}

// GET /api/products/:slug/reviews
export async function listReviews(req, res, next) {
  try {
    const Product = getProduct();
    const Review = getReview();

    const product = await Product.findOne({
      where: { slug: req.params.slug },
      attributes: ['id', 'rating', 'numReviews'],
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const reviews = await Review.findAll({
      where: { productId: product.id },
      order: [['createdAt', 'DESC']],
    });

    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));

    res.json({
      reviews,
      average: product.rating,
      total: product.numReviews,
      breakdown,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/:slug/reviews
export async function upsertReview(req, res, next) {
  try {
    const Product = getProduct();
    const Review = getReview();

    const { rating, comment } = req.body;
    const numeric = Number(rating);
    if (!numeric || numeric < 1 || numeric > 5) {
      return res.status(400).json({ message: 'Please give a rating between 1 and 5 stars.' });
    }

    const product = await Product.findOne({
      where: { slug: req.params.slug },
      attributes: ['id'],
    });
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const verifiedPurchase = await hasPurchased(req.user.id, product.id);

    let review = await Review.findOne({
      where: { productId: product.id, userId: req.user.id },
    });

    if (review) {
      await review.update({
        name: req.user.name,
        rating: numeric,
        comment: (comment || '').trim(),
        verifiedPurchase,
      });
    } else {
      review = await Review.create({
        productId: product.id,
        userId: req.user.id,
        name: req.user.name,
        rating: numeric,
        comment: (comment || '').trim(),
        verifiedPurchase,
      });
    }

    await recalcProductRating(product.id);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reviews/:id
export async function deleteReview(req, res, next) {
  try {
    const Review = getReview();
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const isAuthor = String(review.userId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    let isManagerOfProduct = false;
    if (req.user.role === 'shopmanager') {
      isManagerOfProduct = await canManageProduct(req.user, review.productId);
    }

    if (!isAuthor && !isAdmin && !isManagerOfProduct) {
      return res.status(403).json({ message: 'You do not have permission to delete this review.' });
    }

    const productId = review.productId;
    await review.destroy();
    await recalcProductRating(productId);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    next(err);
  }
}
