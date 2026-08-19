import mongoose from 'mongoose';

/**
 * A promotional slide on the home page carousel.
 *
 * `order` decides the running order and `isActive` takes a slide off the site
 * without deleting it — a seasonal banner can be switched back on next year
 * rather than retyped.
 */
const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    /** Background photo. An uploaded "/uploads/…" path or an external URL. */
    image: { type: String, default: '' },
    /** Where the button goes. Internal route ("/shop?deals=true") or full URL. */
    link: { type: String, default: '/shop' },
    ctaLabel: { type: String, default: 'Shop now' },
    /**
     * Which way the text is painted. A banner sitting on a dark photo needs
     * light text and vice versa — the photo decides, so it is stored per slide
     * rather than derived.
     */
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// The storefront's only query is "active slides in running order".
bannerSchema.index({ isActive: 1, order: 1 });

export default mongoose.model('Banner', bannerSchema);
