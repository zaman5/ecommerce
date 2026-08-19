/**
 * Puts three starter slides in the home page carousel.
 *
 * ADDITIVE and idempotent — it inserts only when the collection is empty, so
 * running it twice never duplicates a slide and it will not overwrite banners
 * an admin has since written. Unlike `npm run seed`, it touches nothing else in
 * the database.
 *
 *   npm run seed:banners
 *
 * These are placeholders. Replace them from Admin → Banners.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Banner from './models/Banner.js';

const STARTERS = [
  {
    title: 'Back to school, sorted',
    subtitle: 'Bags, lunch boxes and stationery — up to 40% off this week.',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80',
    link: '/shop?deals=true',
    ctaLabel: 'Shop the sale',
    theme: 'dark',
    order: 0,
  },
  {
    title: 'Everything for the new term',
    subtitle: 'Notebooks, art supplies and educational toys, delivered in 24 hours.',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1600&q=80',
    link: '/shop',
    ctaLabel: 'Browse all products',
    theme: 'dark',
    order: 1,
  },
  {
    title: 'Free delivery over Rs 5,000',
    subtitle: 'Across Pakistan, with live tracking on every order.',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1600&q=80',
    link: '/shop',
    ctaLabel: 'Start shopping',
    theme: 'dark',
    order: 2,
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Banner.countDocuments();
  if (existing > 0) {
    console.log(`ℹ️  ${existing} banner(s) already exist — nothing to do.`);
    console.log('   Manage them in the admin panel under Banners.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const created = await Banner.insertMany(STARTERS);
  console.log(`✅ ${created.length} starter banners added`);
  for (const b of created) console.log(`   ${b.order + 1}. ${b.title}`);
  console.log('\n   Edit or replace them in the admin panel under Banners.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
