import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// Recalculates a product's average rating + review count from its reviews.
// Called after every create/update/delete so the two never drift apart.
export async function recalcProductRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(productId, {
    rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
    numReviews: agg ? agg.count : 0,
  });
}

// Has this customer received this product in a delivered order?
async function hasPurchased(userId, productId) {
  const count = await Order.countDocuments({
    user: userId,
    status: 'delivered',
    'items.product': productId,
  });
  return count > 0;
}

// GET /api/products/:slug/reviews  (public)
export async function listReviews(req, res, next) {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).select('_id rating numReviews');
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });

    // Star histogram (5 → 1) so the UI can draw a breakdown bar.
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

// POST /api/products/:slug/reviews  (logged-in customers)
// Posting again replaces your existing review rather than adding a second one.
export async function upsertReview(req, res, next) {
  try {
    const { rating, comment } = req.body;
    const numeric = Number(rating);
    if (!numeric || numeric < 1 || numeric > 5) {
      return res.status(400).json({ message: 'Please give a rating between 1 and 5 stars.' });
    }

    const product = await Product.findOne({ slug: req.params.slug }).select('_id');
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const verifiedPurchase = await hasPurchased(req.user._id, product._id);

    const review = await Review.findOneAndUpdate(
      { product: product._id, user: req.user._id },
      {
        product: product._id,
        user: req.user._id,
        name: req.user.name,
        rating: numeric,
        comment: (comment || '').trim(),
        verifiedPurchase,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await recalcProductRating(product._id);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reviews/:id  (the author, or an admin)
export async function deleteReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const isAuthor = review.user.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own review.' });
    }

    await review.deleteOne();
    await recalcProductRating(review.product);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    next(err);
  }
}
