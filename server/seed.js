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
  schoolBags: `${IMG}1553062407-98eeb64c6a62?w=600&q=80`,
  babyBags: `${IMG}1622560480605-d83c853bc5c3?w=600&q=80`,
  newbornBags: `${IMG}1555252333-9f8e92e65df9?w=600&q=80`,
  lunchBoxes: `${IMG}1546069901-ba9599a7e63c?w=600&q=80`,
  waterBottles: `${IMG}1602143407151-7111542de6e8?w=600&q=80`,
  educationalToys: `${IMG}1587654780291-39c9404d746b?w=600&q=80`,
  mobileCases: `${IMG}1601593346740-925612772716?w=600&q=80`,
};

// GET /api/categories sorts by name, so the order here is only for readability
// — it does not affect how the storefront lists them.
const categoriesSeed = [
  { name: 'School Bags', slug: 'school-bags', image: photos.schoolBags, description: 'Light, sturdy backpacks for every school day.' },
  { name: 'Baby Bags', slug: 'baby-bags', image: photos.babyBags, description: 'Roomy changing bags that keep everything to hand.' },
  { name: 'Newborn Bags', slug: 'newborn-bags', image: photos.newbornBags, description: 'Hospital and first-outing bags for brand-new arrivals.' },
  { name: 'Lunch Boxes', slug: 'lunch-boxes', image: photos.lunchBoxes, description: 'Leak-proof boxes that keep lunch fresh till break.' },
  { name: 'Water Bottles', slug: 'water-bottles', image: photos.waterBottles, description: 'Spill-free bottles sized for little hands.' },
  { name: 'Educational Toys', slug: 'educational-toys', image: photos.educationalToys, description: 'Play that quietly teaches counting, letters and logic.' },
  { name: 'Mobile Cases', slug: 'mobile-cases', image: photos.mobileCases, description: 'Drop-proof, kid-friendly cases for family phones.' },
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
  // ---- School Bags ----
  make('Classic Two-Pocket School Backpack', 'school-bags', 2499, { compareAtPrice: 2999, ageGroup: '4y+', unitsSold: 64, isFeatured: true, rating: 4.7, image: photos.schoolBags, description: 'Padded straps and a reinforced base for books that keep getting heavier. Water-resistant outer with a roomy front pocket.' }),
  make('Wheeled Trolley School Bag', 'school-bags', 4299, { compareAtPrice: 4999, ageGroup: '4y+', unitsSold: 21, stock: 9, image: photos.schoolBags, description: 'Pull-along wheels and a retractable handle to take the weight off small shoulders. Straps tuck away when not in use.' }),
  make('Mini Pre-School Backpack', 'school-bags', 1499, { ageGroup: '2-4y', unitsSold: 38, image: photos.schoolBags, description: 'Sized down for nursery and playgroup — big enough for a snack box, a spare set of clothes and a favourite toy.' }),

  // ---- Baby Bags ----
  make('Everyday Diaper Backpack', 'baby-bags', 3999, { compareAtPrice: 4699, unitsSold: 47, isFeatured: true, rating: 4.8, image: photos.babyBags, description: 'Insulated bottle pockets, a wipe-clean lining and a fold-out changing mat. Carries on the back or clips to the pram.' }),
  make('Quilted Shoulder Baby Bag', 'baby-bags', 3299, { unitsSold: 12, image: photos.babyBags, description: 'A softer, lighter option for short trips, with a zipped valuables pocket and an adjustable shoulder strap.' }),
  make('Compact Nappy Caddy Organiser', 'baby-bags', 1899, { unitsSold: 29, stock: 6, image: photos.babyBags, description: 'Keeps nappies, creams and wipes sorted in one carry handle — moves from nursery to living room in one lift.' }),

  // ---- Newborn Bags ----
  make('Hospital Ready Newborn Bag', 'newborn-bags', 3499, { compareAtPrice: 3999, ageGroup: '0-6m', unitsSold: 33, isFeatured: true, rating: 4.9, image: photos.newbornBags, description: 'Packed-and-waiting bag with labelled compartments for mum and baby, so nothing gets hunted for at 3am.' }),
  make('First Outing Newborn Tote', 'newborn-bags', 2699, { ageGroup: '0-6m', unitsSold: 18, image: photos.newbornBags, description: 'Light tote for short trips in the early weeks, with a padded base and room for two bottles.' }),
  make('Swaddle & Essentials Travel Set', 'newborn-bags', 2299, { ageGroup: '0-6m', unitsSold: 7, stock: 5, image: photos.newbornBags, description: 'Zip pouch with two muslin swaddles, a changing mat and space for the day’s essentials.' }),

  // ---- Lunch Boxes ----
  make('Leak-Proof Bento Lunch Box', 'lunch-boxes', 1299, { compareAtPrice: 1599, ageGroup: '4y+', unitsSold: 71, isFeatured: true, rating: 4.6, image: photos.lunchBoxes, description: 'Four sealed compartments keep wet and dry foods apart. Clip-lock lid, dishwasher safe, no BPA.' }),
  make('Insulated Stainless Food Jar', 'lunch-boxes', 1899, { ageGroup: '4y+', unitsSold: 24, image: photos.lunchBoxes, description: 'Keeps a hot lunch warm until break and cold food chilled. Wide mouth so small spoons fit easily.' }),
  make('Toddler Snack Box (3 Compartments)', 'lunch-boxes', 799, { ageGroup: '1-2y', unitsSold: 52, stock: 8, image: photos.lunchBoxes, description: 'Small portions, soft-open latches little hands can manage on their own. Fits neatly in any school bag.' }),

  // ---- Water Bottles ----
  make('Spill-Free Straw Water Bottle', 'water-bottles', 899, { compareAtPrice: 1099, ageGroup: '2-4y', unitsSold: 88, isFeatured: true, rating: 4.7, image: photos.waterBottles, description: 'Weighted straw draws from any angle and the lid locks shut in a bag. Easy to pull apart for a proper wash.' }),
  make('Insulated Steel Bottle (500ml)', 'water-bottles', 1499, { ageGroup: '4y+', unitsSold: 36, image: photos.waterBottles, description: 'Stays cold for a full school day. Powder-coated finish that survives being dropped on the playground.' }),
  make('Toddler Sipper with Handles', 'water-bottles', 649, { ageGroup: '1-2y', unitsSold: 43, stock: 7, image: photos.waterBottles, description: 'Two chunky grips and a soft spout for the move from bottle to cup. Holds 250ml.' }),

  // ---- Educational Toys ----
  make('Wooden Alphabet Puzzle Board', 'educational-toys', 1399, { compareAtPrice: 1699, ageGroup: '2-4y', unitsSold: 57, isFeatured: true, rating: 4.8, image: photos.educationalToys, description: 'Chunky lift-out letters with pictures underneath. Builds letter recognition before school starts.' }),
  make('Counting & Sorting Number Blocks', 'educational-toys', 1199, { ageGroup: '2-4y', unitsSold: 31, image: photos.educationalToys, description: 'Match numbers to quantities and sort by colour and shape — early maths that plays like a game.' }),
  make('Build-It Engineering Brick Set (120 pcs)', 'educational-toys', 2499, { ageGroup: '4y+', unitsSold: 19, stock: 10, image: photos.educationalToys, description: 'Open-ended bricks with an idea booklet, for children who would rather invent than follow instructions.' }),

  // ---- Mobile Cases ----
  make('Shockproof Kids Phone Case', 'mobile-cases', 899, { compareAtPrice: 1099, unitsSold: 40, rating: 4.4, image: photos.mobileCases, description: 'Raised bezel and cushioned corners that take the drop instead of the screen. Grippy edges for small hands.' }),
  make('Cartoon Silicone Phone Case', 'mobile-cases', 649, { unitsSold: 26, image: photos.mobileCases, description: 'Soft silicone in bright character prints, slim enough to keep the phone pocket-sized.' }),
  make('Kids Tablet Case with Stand', 'mobile-cases', 1799, { unitsSold: 9, stock: 4, image: photos.mobileCases, description: 'Foam bumper case with a fold-out handle that doubles as a stand for hands-free watching.' }),

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
