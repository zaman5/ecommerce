import mongoose from 'mongoose';

/**
 * Settings for the Flash Sale strip on the home page.
 *
 * A singleton — there is one flash sale section, so the document is fetched and
 * written with a fixed key rather than by id. `getSettings()` upserts, so the
 * collection needs no seeding and the storefront always has something to read.
 */
const flashSaleSchema = new mongoose.Schema(
  {
    /** Fixed — enforces "only one" at the database, not just by convention. */
    key: { type: String, default: 'default', unique: true, immutable: true },

    isEnabled: { type: Boolean, default: true },
    title: { type: String, default: '⚡ Flash Sale', trim: true, maxlength: 80 },

    /**
     * How the timer behaves:
     *   midnight — counts down to local midnight, so it resets daily.
     *   endsAt   — counts down to a fixed moment; the whole section disappears
     *              once it passes, because a sale showing 00:00:00 forever is
     *              worse than no sale at all.
     *   none     — no timer.
     */
    countdownMode: { type: String, enum: ['midnight', 'endsAt', 'none'], default: 'midnight' },
    timerLabel: { type: String, default: 'On Sale Ends In', trim: true, maxlength: 60 },
    endsAt: { type: Date, default: null },

    ctaLabel: { type: String, default: 'Shop All Deals', trim: true, maxlength: 60 },
    ctaLink: { type: String, default: '/shop?deals=true', trim: true, maxlength: 300 },

    /** How many discounted products the strip pulls, and in what order. */
    limit: { type: Number, default: 12, min: 4, max: 24 },
    sort: {
      type: String,
      enum: ['popular', 'newest', 'priceLow', 'priceHigh', 'rating'],
      default: 'popular',
    },
  },
  { timestamps: true }
);

/** The one document, created on first read so callers never get null. */
flashSaleSchema.statics.getSettings = function () {
  return this.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model('FlashSale', flashSaleSchema);
