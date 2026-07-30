import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Review from './models/Review.js';
import { recalcProductRating } from './controllers/reviewController.js';

const IMG = 'https://images.unsplash.com/photo-';
// A few royalty-free baby-themed Unsplash photos (swap for your own product photos).
// Every URL here is checked to return 200 — Unsplash retires photo IDs over time,
// so if an image ever goes blank, replace the ID and re-run `npm run seed`.
const photos = {
  clothing: `${IMG}1519238263530-99bdd11df2ea?w=600&q=80`,
  toys: `${IMG}1584824486509-112e4181ff6b?w=600&q=80`,
  feeding: `${IMG}1519689680058-324335c77eba?w=600&q=80`,
  diapers: `${IMG}1596461404969-9ae70f2830c1?w=600&q=80`,
  gear: `${IMG}1544126592-807ade215a0b?w=600&q=80`,
  bath: `${IMG}1566004100631-35d015d6a491?w=600&q=80`,
};

const categoriesSeed = [
  { name: 'Clothing', slug: 'clothing', image: photos.clothing, description: 'Soft, comfy outfits for little ones.' },
  { name: 'Toys', slug: 'toys', image: photos.toys, description: 'Safe, fun toys for every age.' },
  { name: 'Feeding', slug: 'feeding', image: photos.feeding, description: 'Bottles, bibs and mealtime must-haves.' },
  { name: 'Diapers & Wipes', slug: 'diapers-wipes', image: photos.diapers, description: 'Gentle care for delicate skin.' },
  { name: 'Baby Gear', slug: 'baby-gear', image: photos.gear, description: 'Strollers, carriers and more.' },
  { name: 'Bath & Skincare', slug: 'bath-skincare', image: photos.bath, description: 'Tear-free, tender care.' },
];

function make(name, catSlug, price, opts = {}) {
  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    catSlug,
    price,
    compareAtPrice: opts.compareAtPrice || 0,
    brand: opts.brand || 'Funkybunky',
    ageGroup: opts.ageGroup || 'all',
    stock: opts.stock ?? 25,
    rating: opts.rating ?? 4.5,
    numReviews: opts.numReviews ?? 12,
    unitsSold: opts.unitsSold ?? 0,
    isFeatured: opts.isFeatured || false,
    description:
      opts.description ||
      'Thoughtfully made for babies and toddlers with gentle, high-quality materials. Easy to clean and built to last.',
    image: opts.image,
  };
}

const productsSeed = [
  make('Organic Cotton Onesie (3-Pack)', 'clothing', 1499, { compareAtPrice: 1999, ageGroup: '0-6m', unitsSold: 42, isFeatured: true, rating: 4.8, image: photos.clothing }),
  make('Soft Knit Baby Cardigan', 'clothing', 1299, { ageGroup: '6-12m', unitsSold: 8, image: photos.clothing }),
  make('Wooden Stacking Rings Toy', 'toys', 999, { ageGroup: '6-12m', unitsSold: 60, isFeatured: true, rating: 4.9, image: photos.toys }),
  make('Plush Sensory Activity Cube', 'toys', 1799, { ageGroup: '0-6m', unitsSold: 15, image: photos.toys }),
  make('Anti-Colic Baby Bottle (250ml)', 'feeding', 799, { compareAtPrice: 999, unitsSold: 35, stock: 4, image: photos.feeding }),
  make('Silicone Bib with Food Catcher', 'feeding', 649, { ageGroup: '6-12m', unitsSold: 22, image: photos.feeding }),
  make('Ultra-Soft Diapers Newborn (Pack of 40)', 'diapers-wipes', 1099, { ageGroup: '0-6m', unitsSold: 80, isFeatured: true, stock: 3, rating: 4.7, image: photos.diapers }),
  make('Water Wipes Fragrance-Free (2-Pack)', 'diapers-wipes', 599, { unitsSold: 50, image: photos.diapers }),
  make('Lightweight Travel Stroller', 'baby-gear', 18999, { compareAtPrice: 22999, ageGroup: 'all', unitsSold: 12, rating: 4.6, isFeatured: true, image: photos.gear }),
  make('Ergonomic Baby Carrier', 'baby-gear', 6499, { ageGroup: 'all', unitsSold: 2, image: photos.gear }),
  make('Tear-Free Baby Shampoo 400ml', 'bath-skincare', 549, { unitsSold: 28, image: photos.bath }),
  make('Gentle Moisturizing Baby Lotion', 'bath-skincare', 699, { unitsSold: 1, image: photos.bath }),
];

// Demo shoppers who leave the sample reviews.
const reviewersSeed = [
  { name: 'Ayesha K.', email: 'ayesha@example.com' },
  { name: 'Bilal R.', email: 'bilal@example.com' },
  { name: 'Sana M.', email: 'sana@example.com' },
  { name: 'Hamza T.', email: 'hamza@example.com' },
];

// [rating, comment] pairs, cycled across products so every item has a few.
const reviewTexts = [
  [5, 'Exactly as described and the quality is lovely. My little one is very happy with it.'],
  [4, 'Good value for the price. Delivery took a couple of days but everything arrived safely.'],
  [5, 'Bought this twice now. Soft, easy to wash, and it has held up really well.'],
  [3, 'Does the job, though it runs a little smaller than I expected. Still happy overall.'],
  [5, 'Wonderful quality — gentle on my baby’s skin and no irritation at all.'],
  [4, 'Nicely made and well packaged. Would recommend to other parents.'],
];

async function run() {
  await connectDB(process.env.MONGO_URI);

  console.log('🧹 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log('👤 Creating admin + demo client...');
  const admin = new User({
    name: process.env.ADMIN_NAME || 'Store Admin',
    email: process.env.ADMIN_EMAIL || 'admin@funkybunky.pk',
    role: 'admin',
  });
  await admin.setPassword(process.env.ADMIN_PASSWORD || 'admin12345');
  await admin.save();

  const client = new User({ name: 'Demo Customer', email: 'customer@funkybunky.pk', role: 'client', phone: '03001234567' });
  await client.setPassword('customer123');
  await client.save();

  console.log('🏷️  Creating categories...');
  const cats = await Category.insertMany(categoriesSeed);
  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c._id]));

  console.log('📦 Creating products...');
  const docs = productsSeed.map((p) => ({
    name: p.name,
    slug: p.slug,
    description: p.description,
    brand: p.brand,
    category: catMap[p.catSlug],
    ageGroup: p.ageGroup,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    images: [p.image],
    stock: p.stock,
    // rating / numReviews are derived from the seeded reviews below, so the
    // stars a shopper sees always match the reviews actually on the page.
    rating: 0,
    numReviews: 0,
    unitsSold: p.unitsSold,
    isFeatured: p.isFeatured,
  }));
  const products = await Product.insertMany(docs);

  console.log('⭐ Creating reviewers + reviews...');
  const reviewers = [];
  for (const r of reviewersSeed) {
    const u = new User({ name: r.name, email: r.email, role: 'client' });
    await u.setPassword('reviewer123');
    await u.save();
    reviewers.push(u);
  }

  let cursor = 0;
  for (const [pIndex, product] of products.entries()) {
    // 2–4 reviews per product. The reviewer index is offset by the product so
    // no reviewer is used twice on the same product (the unique index forbids it).
    const howMany = 2 + (pIndex % 3);
    for (let i = 0; i < howMany; i++) {
      const reviewer = reviewers[(pIndex + i) % reviewers.length];
      const [rating, comment] = reviewTexts[cursor % reviewTexts.length];
      await Review.create({
        product: product._id,
        user: reviewer._id,
        name: reviewer.name,
        rating,
        comment,
        verifiedPurchase: i === 0,
      });
      cursor++;
    }
    await recalcProductRating(product._id);
  }

  const reviewCount = await Review.countDocuments();

  console.log('\n✅ Seed complete!');
  console.log(`   ${products.length} products · ${reviewCount} reviews`);
  console.log('----------------------------------------');
  console.log('Admin login   :', admin.email, '/', process.env.ADMIN_PASSWORD || 'admin12345');
  console.log('Client login  : customer@funkybunky.pk / customer123');
  console.log('----------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
