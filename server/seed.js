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
// Royalty-free school-supply Unsplash photos (swap for your own product photos).
// Every URL here is checked to return 200 — Unsplash retires photo IDs over time,
// so if an image ever goes blank, replace the ID and re-run `npm run seed`.
const photos = {
  schoolBags: `${IMG}1553062407-98eeb64c6a62?w=600&q=80`,
  lunchBoxes: `${IMG}1726726192151-6d4139ff229d?w=600&q=80`,
  waterBottles: `${IMG}1602143407151-7111542de6e8?w=600&q=80`,
  stationery: `${IMG}1574944558125-f8d12f23be89?w=600&q=80`,
  notebooks: `${IMG}1497633762265-9d179a990aa6?w=600&q=80`,
  deskSet: `${IMG}1531346878377-a5be20888e57?w=600&q=80`,
  artCraft: `${IMG}1452860606245-08befc0ff44b?w=600&q=80`,
  colouring: `${IMG}1513542789411-b6a5d4f31634?w=600&q=80`,
  educationalToys: `${IMG}1587654780291-39c9404d746b?w=600&q=80`,
  mobileCases: `${IMG}1601593346740-925612772716?w=600&q=80`,
};

// GET /api/categories sorts by name, so the order here is only for readability
// — it does not affect how the storefront lists them.
const categoriesSeed = [
  { name: 'School Bags', slug: 'school-bags', image: photos.schoolBags, description: 'Light, sturdy backpacks for every school day.' },
  { name: 'Lunch Boxes', slug: 'lunch-boxes', image: photos.lunchBoxes, description: 'Leak-proof boxes that keep lunch fresh till break.' },
  { name: 'Water Bottles', slug: 'water-bottles', image: photos.waterBottles, description: 'Spill-free bottles that survive a whole school day.' },
  { name: 'Stationery', slug: 'stationery', image: photos.stationery, description: 'Pens, pencil cases and geometry sets that last the term.' },
  { name: 'Notebooks & Diaries', slug: 'notebooks-diaries', image: photos.notebooks, description: 'Ruled, squared and blank — for every subject on the timetable.' },
  { name: 'Art & Craft', slug: 'art-craft', image: photos.artCraft, description: 'Colours, glue and cutting tools for project days.' },
  { name: 'Educational Toys', slug: 'educational-toys', image: photos.educationalToys, description: 'Play that quietly teaches counting, letters and logic.' },
  { name: 'Mobile Cases', slug: 'mobile-cases', image: photos.mobileCases, description: 'Drop-proof, kid-friendly cases for phones and tablets.' },
];

function make(name, catSlug, price, opts = {}) {
  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    catSlug,
    price,
    compareAtPrice: opts.compareAtPrice || 0,
    brand: opts.brand || 'Wondercart',
    ageGroup: opts.ageGroup || 'all',
    stock: opts.stock ?? 25,
    rating: opts.rating ?? 4.5,
    numReviews: opts.numReviews ?? 12,
    unitsSold: opts.unitsSold ?? 0,
    isFeatured: opts.isFeatured || false,
    description:
      opts.description ||
      'Made for the school run and everything after it — hard-wearing materials, easy to clean, and built to last the full year.',
    image: opts.image,
  };
}

const productsSeed = [
  // ---- School Bags ----
  make('Classic Two-Pocket School Backpack', 'school-bags', 2499, { compareAtPrice: 2999, ageGroup: 'primary', unitsSold: 64, isFeatured: true, rating: 4.7, image: photos.schoolBags, description: 'Padded straps and a reinforced base for books that keep getting heavier. Water-resistant outer with a roomy front pocket.' }),
  make('Wheeled Trolley School Bag', 'school-bags', 4299, { compareAtPrice: 4999, ageGroup: 'primary', unitsSold: 21, stock: 9, image: photos.schoolBags, description: 'Pull-along wheels and a retractable handle to take the weight off small shoulders. Straps tuck away when not in use.' }),
  make('Mini Pre-School Backpack', 'school-bags', 1499, { ageGroup: 'pre-school', unitsSold: 38, image: photos.schoolBags, description: 'Sized down for nursery and playgroup — big enough for a snack box, a spare set of clothes and a favourite toy.' }),
  make('Laptop-Ready Senior Rucksack', 'school-bags', 3899, { compareAtPrice: 4499, ageGroup: 'high', unitsSold: 27, image: photos.schoolBags, description: 'Padded 15" laptop sleeve, a hidden zip pocket and breathable back panel — sized for college folders, not lunch toys.' }),

  // ---- Lunch Boxes ----
  make('Leak-Proof Bento Lunch Box', 'lunch-boxes', 1299, { compareAtPrice: 1599, ageGroup: 'primary', unitsSold: 71, isFeatured: true, rating: 4.6, image: photos.lunchBoxes, description: 'Four sealed compartments keep wet and dry foods apart. Clip-lock lid, dishwasher safe, no BPA.' }),
  make('Insulated Stainless Food Jar', 'lunch-boxes', 1899, { ageGroup: 'middle', unitsSold: 24, image: photos.lunchBoxes, description: 'Keeps a hot lunch warm until break and cold food chilled. Wide mouth so a normal spoon fits easily.' }),
  make('Three-Compartment Snack Box', 'lunch-boxes', 799, { ageGroup: 'pre-school', unitsSold: 52, stock: 8, image: photos.lunchBoxes, description: 'Small portions with soft-open latches little hands can manage on their own. Fits neatly in any school bag.' }),

  // ---- Water Bottles ----
  make('Spill-Free Straw Water Bottle', 'water-bottles', 899, { compareAtPrice: 1099, ageGroup: 'pre-school', unitsSold: 88, isFeatured: true, rating: 4.7, image: photos.waterBottles, description: 'Weighted straw draws from any angle and the lid locks shut in a bag. Easy to pull apart for a proper wash.' }),
  make('Insulated Steel Bottle (500ml)', 'water-bottles', 1499, { ageGroup: 'primary', unitsSold: 36, image: photos.waterBottles, description: 'Stays cold for a full school day. Powder-coated finish that survives being dropped on the playground.' }),
  make('Flip-Top Sports Bottle (750ml)', 'water-bottles', 1099, { ageGroup: 'high', unitsSold: 43, stock: 7, image: photos.waterBottles, description: 'One-hand flip lid for between drills, with a wide neck for ice cubes and a carry loop that clips to a kit bag.' }),

  // ---- Stationery ----
  make('Zip Pencil Case with Pen Loops', 'stationery', 699, { compareAtPrice: 899, ageGroup: 'primary', unitsSold: 93, isFeatured: true, rating: 4.6, image: photos.stationery, description: 'Two zipped layers with elastic loops so pens stop rattling loose. Wipe-clean canvas that hides a term of ink marks.' }),
  make('12-Piece Geometry Box Set', 'stationery', 549, { ageGroup: 'middle', unitsSold: 47, image: photos.stationery, description: 'Compass, protractor, set squares and a metal ruler in a snap-shut tin — the full maths kit in one purchase.' }),
  make('Everyday Ballpoint Pens (10-Pack)', 'stationery', 399, { ageGroup: 'all', unitsSold: 118, stock: 60, image: photos.deskSet, description: 'Smooth 0.7mm blue ink that does not blob mid-sentence. Enough spares to survive the ones that vanish in class.' }),

  // ---- Notebooks & Diaries ----
  make('A4 Spiral Ruled Notebook (5-Pack)', 'notebooks-diaries', 1199, { compareAtPrice: 1499, ageGroup: 'middle', unitsSold: 66, isFeatured: true, rating: 4.5, image: photos.notebooks, description: 'One notebook per subject, 160 pages each. Thick paper that does not ghost when you write on both sides.' }),
  make('Hardcover School Diary & Planner', 'notebooks-diaries', 899, { ageGroup: 'high', unitsSold: 29, image: photos.notebooks, description: 'Week-to-view layout with a timetable page and homework tracker. Stitched hardcover that lasts the whole year.' }),
  make('Squared Maths Copy (4-Pack)', 'notebooks-diaries', 649, { ageGroup: 'primary', unitsSold: 54, stock: 12, image: photos.deskSet, description: '5mm squares for graphs, tables and long division. Stapled spine that opens flat on a small desk.' }),

  // ---- Art & Craft ----
  make('24 Colouring Pencils Tin', 'art-craft', 799, { compareAtPrice: 999, ageGroup: 'primary', unitsSold: 82, isFeatured: true, rating: 4.8, image: photos.colouring, description: 'Soft, break-resistant leads in a hinged tin. Bright enough to fill a page without pressing hard.' }),
  make('Washable Poster Paint Set (12 Colours)', 'art-craft', 1099, { ageGroup: 'primary', unitsSold: 35, image: photos.artCraft, description: 'Thick, bright paints that wash out of uniforms and off tables. Screw-top pots so half-used colours do not dry out.' }),
  make('Craft Kit: Safety Scissors, Glue & Tape', 'art-craft', 949, { ageGroup: 'pre-school', unitsSold: 41, stock: 10, image: photos.artCraft, description: 'Round-tip scissors, two glue sticks and coloured tape — everything a project-day assignment usually asks for.' }),

  // ---- Educational Toys ----
  make('Wooden Alphabet Puzzle Board', 'educational-toys', 1399, { compareAtPrice: 1699, ageGroup: 'pre-school', unitsSold: 57, isFeatured: true, rating: 4.8, image: photos.educationalToys, description: 'Chunky lift-out letters with pictures underneath. Builds letter recognition before school starts.' }),
  make('Counting & Sorting Number Blocks', 'educational-toys', 1199, { ageGroup: 'pre-school', unitsSold: 31, image: photos.educationalToys, description: 'Match numbers to quantities and sort by colour and shape — early maths that plays like a game.' }),
  make('Build-It Engineering Brick Set (120 pcs)', 'educational-toys', 2499, { ageGroup: 'primary', unitsSold: 19, stock: 10, image: photos.educationalToys, description: 'Open-ended bricks with an idea booklet, for children who would rather invent than follow instructions.' }),

  // ---- Mobile Cases ----
  make('Shockproof Kids Phone Case', 'mobile-cases', 899, { compareAtPrice: 1099, unitsSold: 40, rating: 4.4, image: photos.mobileCases, description: 'Raised bezel and cushioned corners that take the drop instead of the screen. Grippy edges for small hands.' }),
  make('Cartoon Silicone Phone Case', 'mobile-cases', 649, { unitsSold: 26, image: photos.mobileCases, description: 'Soft silicone in bright character prints, slim enough to keep the phone pocket-sized.' }),
  make('Kids Tablet Case with Stand', 'mobile-cases', 1799, { unitsSold: 9, stock: 4, image: photos.mobileCases, description: 'Foam bumper case with a fold-out handle that doubles as a stand for hands-free watching.' }),
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
  [5, 'Exactly as described and the quality is lovely. My son takes it to school every day.'],
  [4, 'Good value for the price. Delivery took a couple of days but everything arrived safely.'],
  [5, 'Bought this twice now. Easy to clean, and it has survived a full term already.'],
  [3, 'Does the job, though it runs a little smaller than I expected. Still happy overall.'],
  [5, 'Sturdy and well finished — no loose stitching or sharp edges anywhere.'],
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
    email: process.env.ADMIN_EMAIL || 'admin@wondercart.pk',
    role: 'admin',
  });
  await admin.setPassword(process.env.ADMIN_PASSWORD || 'admin12345');
  await admin.save();

  const client = new User({ name: 'Demo Customer', email: 'customer@wondercart.pk', role: 'client', phone: '03001234567' });
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
  console.log('Client login  : customer@wondercart.pk / customer123');
  console.log('----------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
