import 'dotenv/config';
import { connectDB } from './config/db.js';
import { getCategory } from './models/Category.js';
import { getProduct, getProductColor } from './models/Product.js';

const IMG = 'https://images.unsplash.com/photo-';
const img = (id) => `${IMG}${id}?w=600&q=80`;

const photos = {
  headphones: img('1505740420928-5e560c06d30e'),
  laptop: img('1496181133206-80ce9b88a853'),
  smartphone: img('1511707171634-5f897ff02aa9'),
  smartwatch: img('1546868871-7041f2a55e12'),
  clothing: img('1445205170230-053b83016050'),
  sneakers: img('1560769629-975ec94e6a86'),
  watch: img('1524805444758-089113d48a6d'),
  handbag: img('1584917865442-de89df76afd3'),
  vintageCamera: img('1516035069371-29a1b244cc32'),
  painting: img('1541961017774-22349e4a1262'),
  coins: img('1621416894569-0f39ed31d247'),
  vinyl: img('1493663284031-b7e3aefcae8e'),
  football: img('1461896836934-ffe607ba8211'),
  dumbbells: img('1517836357463-d25dfeac3438'),
  bicycle: img('1485965120184-e220f721d03e'),
  yoga: img('1571019613454-1cb2f99b2d8b'),
  cosmetics: img('1596462502278-27bfdc403348'),
  skincare: img('1571781926291-c477ebfd024b'),
  perfume: img('1541643600914-78b084683601'),
  haircare: img('1522335789203-aabd1fc54bc9'),
  sofa: img('1555041469-a586c61ea9bc'),
  garden: img('1416879595882-3373a0480b5b'),
  kitchen: img('1556909114-f6e7ad7d3136'),
  bedding: img('1595246140625-573b715d11dc'),
};

const categoriesSeed = [
  { name: 'Electronics', slug: 'electronics', image: photos.headphones, description: 'Phones, laptops, audio and wearables from brands people actually know.' },
  { name: 'Fashion', slug: 'fashion', image: photos.clothing, description: 'Clothing, footwear, watches and bags for every day of the week.' },
  { name: 'Collectibles and art', slug: 'collectibles-and-art', image: photos.vintageCamera, description: 'Prints, coins, vinyl and vintage finds worth hanging on to.' },
  { name: 'Sports', slug: 'sports', image: photos.football, description: 'Kit for the pitch, the gym, the road and the mat.' },
  { name: 'Health and beauty', slug: 'health-and-beauty', image: photos.cosmetics, description: 'Skincare, haircare, fragrance and daily essentials.' },
  { name: 'Home and garden', slug: 'home-and-garden', image: photos.sofa, description: 'Furniture, kitchen, bedding and everything that makes a garden grow.' },
];

const C = {
  black: { name: 'Black', hex: '#1f2124' },
  white: { name: 'White', hex: '#f4f4f2' },
  silver: { name: 'Silver', hex: '#c9ccd1' },
  navy: { name: 'Navy', hex: '#1f3358' },
  red: { name: 'Red', hex: '#c0392b' },
  blue: { name: 'Blue', hex: '#2f6fb5' },
  green: { name: 'Forest Green', hex: '#2f5d43' },
  grey: { name: 'Charcoal', hex: '#4a4f55' },
  beige: { name: 'Beige', hex: '#d9c7a9' },
  pink: { name: 'Blush Pink', hex: '#e8a0a8' },
  yellow: { name: 'Mustard', hex: '#d5a021' },
  brown: { name: 'Tan Brown', hex: '#8a5a34' },
};

function make(name, catSlug, price, opts = {}) {
  return {
    colors: opts.colors || [],
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    catSlug,
    price,
    compareAtPrice: opts.compareAtPrice || 0,
    brand: opts.brand || 'Wondercart',
    stock: opts.stock ?? 25,
    unitsSold: opts.unitsSold ?? 0,
    isFeatured: opts.isFeatured || false,
    description: opts.description,
    image: opts.image,
  };
}

const productsSeed = [
  make('Wireless Over-Ear Headphones (ANC)', 'electronics', 12999, { compareAtPrice: 15999, unitsSold: 74, isFeatured: true, image: photos.headphones, description: 'Active noise cancelling with 40 hours of playback on one charge. Folds flat into a hard case for travel.' }),
  make('14" Thin & Light Laptop (16GB RAM)', 'electronics', 149999, { compareAtPrice: 169999, unitsSold: 18, stock: 9, image: photos.laptop, description: '16GB RAM and a 512GB SSD in a 1.3kg aluminium body. All-day battery and a backlit keyboard for late work.' }),
  make('5G Smartphone 128GB (Dual SIM)', 'electronics', 84999, { unitsSold: 42, image: photos.smartphone, description: '6.5" AMOLED display, triple camera and 5000mAh battery. Dual SIM with a dedicated microSD slot.' }),
  make('Fitness Smartwatch with GPS', 'electronics', 18999, { compareAtPrice: 22999, unitsSold: 56, image: photos.smartwatch, description: 'Built-in GPS, heart-rate and sleep tracking with a 10-day battery. Swim-proof to 50 metres.' }),

  make('Everyday Cotton Crew T-Shirt', 'fashion', 1899, { compareAtPrice: 2499, unitsSold: 132, isFeatured: true, image: photos.clothing, description: 'Mid-weight combed cotton that keeps its shape after washing. Pre-shrunk, with a ribbed collar that stays flat.' }),
  make('Low-Top Canvas Sneakers', 'fashion', 4999, { unitsSold: 67, image: photos.sneakers, description: 'Cushioned insole and a vulcanised rubber sole with real grip. Goes with jeans and does not mind rain.' }),
  make('Stainless Steel Analogue Watch', 'fashion', 11999, { compareAtPrice: 14999, unitsSold: 34, stock: 14, image: photos.watch, description: 'Sapphire-coated crystal, 5ATM water resistance and a solid link bracelet with a butterfly clasp.' }),
  make('Structured Leather Shoulder Bag', 'fashion', 8499, { unitsSold: 45, image: photos.handbag, description: 'Full-grain leather with a suede-lined interior, laptop sleeve and an adjustable detachable strap.' }),

  make('Vintage 35mm Film Camera (Refurbished)', 'collectibles-and-art', 24999, { compareAtPrice: 29999, unitsSold: 11, stock: 5, isFeatured: true, image: photos.vintageCamera, description: 'Serviced, light-sealed and test-rolled before dispatch. Comes with the original 50mm lens and a leather case.' }),
  make('Framed Abstract Canvas Print (60x90cm)', 'collectibles-and-art', 13999, { unitsSold: 16, image: photos.painting, description: 'Giclée print on cotton canvas in a solid oak float frame. Arrives strung and ready to hang.' }),
  make('Rare Coin Collector Starter Album', 'collectibles-and-art', 5499, { unitsSold: 22, image: photos.coins, description: 'Acid-free album with 240 labelled pockets, a magnifier and cotton handling gloves for a growing collection.' }),
  make('Classic Rock Vinyl LP Bundle (3 Records)', 'collectibles-and-art', 9999, { compareAtPrice: 11999, unitsSold: 27, stock: 8, image: photos.vinyl, description: 'Three remastered 180g pressings in sealed anti-static sleeves. Graded near-mint on arrival.' }),

  make('Match-Grade Football (Size 5)', 'sports', 3999, { compareAtPrice: 4999, unitsSold: 88, isFeatured: true, image: photos.football, description: 'Thermally bonded panels that keep their shape and stay light in the wet. FIFA-standard size and weight.' }),
  make('Adjustable Dumbbell Set (2–24kg)', 'sports', 34999, { unitsSold: 19, stock: 7, image: photos.dumbbells, description: 'One dial swaps 15 weight settings, replacing a whole rack. Knurled handle and a non-slip storage tray.' }),
  make('21-Speed Aluminium Mountain Bike', 'sports', 62999, { compareAtPrice: 74999, unitsSold: 9, stock: 4, image: photos.bicycle, description: 'Lightweight alloy frame, front suspension and dual disc brakes. Arrives 85% assembled with the tools included.' }),
  make('Non-Slip Yoga Mat (6mm)', 'sports', 4499, { unitsSold: 73, image: photos.yoga, description: 'Closed-cell surface that grips through a sweaty session and wipes clean. Comes with a carry strap.' }),

  make('Everyday Makeup Starter Palette', 'health-and-beauty', 6999, { compareAtPrice: 8499, unitsSold: 91, isFeatured: true, image: photos.cosmetics, description: 'Twelve blendable neutrals in matte and shimmer, plus a dual-ended brush. Paraben-free and never tested on animals.' }),
  make('Vitamin C Brightening Serum (30ml)', 'health-and-beauty', 4299, { unitsSold: 118, image: photos.skincare, description: '15% stabilised vitamin C with hyaluronic acid, in a UV-blocking pump bottle so it does not oxidise.' }),
  make('Eau de Parfum — Amber & Oud (100ml)', 'health-and-beauty', 15999, { compareAtPrice: 18999, unitsSold: 37, stock: 15, image: photos.perfume, description: 'Warm amber over oud and cedar with eight-hour wear. Presented in a weighted glass flacon.' }),
  make('Argan Oil Repair Shampoo & Conditioner', 'health-and-beauty', 3299, { unitsSold: 64, image: photos.haircare, description: 'Sulphate-free pair for dry or colour-treated hair. Softens without weighing roots down.' }),

  make('Three-Seater Fabric Sofa', 'home-and-garden', 89999, { compareAtPrice: 109999, unitsSold: 8, stock: 4, isFeatured: true, image: photos.sofa, description: 'Kiln-dried hardwood frame with high-resilience foam and removable, washable covers. Assembles in under 20 minutes.' }),
  make('Garden Tool Set with Carry Bag (8 pcs)', 'home-and-garden', 6499, { unitsSold: 52, image: photos.garden, description: 'Forged stainless heads on hardwood handles — trowel, fork, pruners, weeder and more, in a waxed canvas bag.' }),
  make('Non-Stick Cookware Set (10 pcs)', 'home-and-garden', 18999, { compareAtPrice: 23999, unitsSold: 39, image: photos.kitchen, description: 'PFOA-free granite coating with induction-ready bases and glass lids. Oven safe to 220°C.' }),
  make('Cotton Percale Bedding Set (King)', 'home-and-garden', 11499, { unitsSold: 47, stock: 18, image: photos.bedding, description: '300-thread-count long-staple cotton that breathes in summer heat. Duvet cover plus two pillowcases.' }),
];

const colorsByCategory = {
  electronics: [C.black, C.white, C.silver],
  fashion: [C.black, C.navy, C.beige, C.pink],
  'collectibles-and-art': [C.black, C.brown],
  sports: [C.black, C.blue, C.red, C.yellow],
  'health-and-beauty': [C.pink, C.beige],
  'home-and-garden': [C.grey, C.green, C.beige, C.navy],
};

const NO_COLOUR = new Set([
  'rare-coin-collector-starter-album',
  'classic-rock-vinyl-lp-bundle-3-records',
  'vitamin-c-brightening-serum-30ml',
  'eau-de-parfum-amber-oud-100ml',
  'argan-oil-repair-shampoo-conditioner',
  'everyday-makeup-starter-palette',
]);

for (const p of productsSeed) {
  if (!p.colors.length && !NO_COLOUR.has(p.slug)) {
    p.colors = colorsByCategory[p.catSlug] || [];
  }
}

async function run() {
  const sequelize = await connectDB();
  if (!sequelize) {
    console.error('Could not connect to database.');
    process.exit(1);
  }
  const Category = getCategory();
  const Product = getProduct();
  const ProductColor = getProductColor();

  console.log('🏷️  Upserting marketplace categories...');
  for (const c of categoriesSeed) {
    const existing = await Category.findOne({ where: { slug: c.slug } });
    if (existing) {
      await existing.update(c);
    } else {
      await Category.create(c);
    }
  }

  const cats = await Category.findAll();
  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  console.log('📦 Upserting marketplace products...');
  for (const p of productsSeed) {
    const existing = await Product.findOne({ where: { slug: p.slug } });
    const data = {
      name: p.name,
      slug: p.slug,
      description: p.description,
      brand: p.brand,
      categoryId: catMap[p.catSlug],
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: [p.image],
      stock: p.stock,
      unitsSold: p.unitsSold,
      isFeatured: p.isFeatured,
      isActive: true,
    };

    let prodId;
    if (existing) {
      await existing.update(data);
      prodId = existing.id;
    } else {
      const created = await Product.create(data);
      prodId = created.id;
    }

    if (p.colors?.length) {
      await ProductColor.destroy({ where: { productId: prodId } });
      await ProductColor.bulkCreate(
        p.colors.map((c) => ({ ...c, productId: prodId }))
      );
    }
  }

  const totalCats = await Category.count();
  const totalProducts = await Product.count();

  console.log('\n✅ Marketplace seed complete!');
  console.log(`   +${categoriesSeed.length} categories · +${productsSeed.length} products`);
  console.log(`   store now has ${totalCats} categories · ${totalProducts} products`);

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
