import { getCategory } from '../models/Category.js';
import { getProduct, getProductColor } from '../models/Product.js';
import { getUser } from '../models/User.js';
import { getBanner } from '../models/Banner.js';
import { getReview } from '../models/Review.js';
import { recalcProductRating } from '../controllers/reviewController.js';

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
  { name: 'Electronics', slug: 'electronics', image: photos.headphones, description: 'Phones, laptops, audio and wearables from top brands.' },
  { name: 'Fashion', slug: 'fashion', image: photos.clothing, description: 'Clothing, footwear, watches and bags for every day.' },
  { name: 'Collectibles & Art', slug: 'collectibles-and-art', image: photos.vintageCamera, description: 'Prints, coins, vinyl and vintage finds.' },
  { name: 'Sports', slug: 'sports', image: photos.football, description: 'Kit for the pitch, gym, road and mat.' },
  { name: 'Health & Beauty', slug: 'health-and-beauty', image: photos.cosmetics, description: 'Skincare, haircare, fragrance and daily essentials.' },
  { name: 'Home & Garden', slug: 'home-and-garden', image: photos.sofa, description: 'Furniture, kitchen, bedding and garden essentials.' },
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

const colorsByCategory = {
  electronics: [C.black, C.white, C.silver],
  fashion: [C.black, C.navy, C.beige, C.pink],
  'collectibles-and-art': [C.black, C.brown],
  sports: [C.black, C.blue, C.red, C.yellow],
  'health-and-beauty': [C.pink, C.beige],
  'home-and-garden': [C.grey, C.green, C.beige, C.navy],
};

function make(name, catSlug, price, opts = {}) {
  return {
    colors: opts.colors || colorsByCategory[catSlug] || [],
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    catSlug,
    price,
    compareAtPrice: opts.compareAtPrice || 0,
    brand: opts.brand || 'Wondercart',
    stock: opts.stock ?? 25,
    rating: opts.rating ?? 4.5,
    numReviews: opts.numReviews ?? 12,
    unitsSold: opts.unitsSold ?? 0,
    isFeatured: opts.isFeatured || false,
    description: opts.description || 'Premium quality product designed for durability, style, and top performance.',
    image: opts.image,
  };
}

const productsSeed = [
  make('Wireless Over-Ear Headphones (ANC)', 'electronics', 12999, { compareAtPrice: 15999, unitsSold: 74, isFeatured: true, rating: 4.8, image: photos.headphones, description: 'Active noise cancelling with 40 hours of playback on one charge. Folds flat into a hard case.' }),
  make('14" Thin & Light Laptop (16GB RAM)', 'electronics', 149999, { compareAtPrice: 169999, unitsSold: 18, stock: 9, rating: 4.7, image: photos.laptop, description: '16GB RAM and a 512GB SSD in a 1.3kg aluminium body. All-day battery and backlit keyboard.' }),
  make('5G Smartphone 128GB (Dual SIM)', 'electronics', 84999, { unitsSold: 42, rating: 4.6, image: photos.smartphone, description: '6.5" AMOLED display, triple camera and 5000mAh battery. Dual SIM with dedicated microSD slot.' }),
  make('Fitness Smartwatch with GPS', 'electronics', 18999, { compareAtPrice: 22999, unitsSold: 56, rating: 4.5, image: photos.smartwatch, description: 'Built-in GPS, heart-rate and sleep tracking with 10-day battery life.' }),

  make('Everyday Cotton Crew T-Shirt', 'fashion', 1899, { compareAtPrice: 2499, unitsSold: 132, isFeatured: true, rating: 4.6, image: photos.clothing, description: 'Mid-weight combed cotton that keeps its shape after washing. Pre-shrunk ribbed collar.' }),
  make('Low-Top Canvas Sneakers', 'fashion', 4999, { unitsSold: 67, rating: 4.5, image: photos.sneakers, description: 'Cushioned insole and a vulcanised rubber sole with great grip. Goes with any casual outfit.' }),
  make('Stainless Steel Analogue Watch', 'fashion', 11999, { compareAtPrice: 14999, unitsSold: 34, stock: 14, rating: 4.8, image: photos.watch, description: 'Sapphire-coated crystal, 5ATM water resistance and solid link bracelet.' }),
  make('Structured Leather Shoulder Bag', 'fashion', 8499, { unitsSold: 45, rating: 4.6, image: photos.handbag, description: 'Full-grain leather with suede-lined interior, laptop sleeve and adjustable strap.' }),

  make('Vintage 35mm Film Camera (Refurbished)', 'collectibles-and-art', 24999, { compareAtPrice: 29999, unitsSold: 11, stock: 5, isFeatured: true, rating: 4.9, image: photos.vintageCamera, description: 'Serviced, light-sealed and test-rolled before dispatch. Includes original 50mm lens.' }),
  make('Framed Abstract Canvas Print (60x90cm)', 'collectibles-and-art', 13999, { unitsSold: 16, rating: 4.7, image: photos.painting, description: 'Giclée print on cotton canvas in a solid oak float frame. Ready to hang.' }),
  make('Rare Coin Collector Starter Album', 'collectibles-and-art', 5499, { unitsSold: 22, rating: 4.8, image: photos.coins, description: 'Acid-free album with 240 labelled pockets, magnifier and cotton handling gloves.' }),
  make('Classic Rock Vinyl LP Bundle (3 Records)', 'collectibles-and-art', 9999, { compareAtPrice: 11999, unitsSold: 27, stock: 8, rating: 4.9, image: photos.vinyl, description: 'Three remastered 180g pressings in sealed anti-static sleeves.' }),

  make('Match-Grade Football (Size 5)', 'sports', 3999, { compareAtPrice: 4999, unitsSold: 88, isFeatured: true, rating: 4.7, image: photos.football, description: 'Thermally bonded panels that hold shape and stay light in wet conditions. FIFA-standard.' }),
  make('Adjustable Dumbbell Set (2–24kg)', 'sports', 34999, { unitsSold: 19, stock: 7, rating: 4.8, image: photos.dumbbells, description: 'One dial swaps 15 weight settings, replacing a full rack. Non-slip grip.' }),
  make('21-Speed Aluminium Mountain Bike', 'sports', 62999, { compareAtPrice: 74999, unitsSold: 9, stock: 4, rating: 4.6, image: photos.bicycle, description: 'Lightweight alloy frame, front suspension and dual disc brakes.' }),
  make('Non-Slip Yoga Mat (6mm)', 'sports', 4499, { unitsSold: 73, rating: 4.7, image: photos.yoga, description: 'Closed-cell surface that grips well during intense sessions. Comes with carry strap.' }),

  make('Everyday Makeup Starter Palette', 'health-and-beauty', 6999, { compareAtPrice: 8499, unitsSold: 91, isFeatured: true, rating: 4.8, image: photos.cosmetics, description: 'Twelve blendable neutrals in matte and shimmer, plus a dual-ended brush.' }),
  make('Vitamin C Brightening Serum (30ml)', 'health-and-beauty', 4299, { unitsSold: 118, rating: 4.9, image: photos.skincare, description: '15% stabilised vitamin C with hyaluronic acid in UV-blocking bottle.' }),
  make('Eau de Parfum — Amber & Oud (100ml)', 'health-and-beauty', 15999, { compareAtPrice: 18999, unitsSold: 37, stock: 15, rating: 4.8, image: photos.perfume, description: 'Warm amber over rich oud and cedar with 8-hour wear.' }),
  make('Argan Oil Repair Shampoo & Conditioner', 'health-and-beauty', 3299, { unitsSold: 64, rating: 4.6, image: photos.haircare, description: 'Sulphate-free pair for dry or colour-treated hair. Deeply moisturizing.' }),

  make('Three-Seater Fabric Sofa', 'home-and-garden', 89999, { compareAtPrice: 109999, unitsSold: 8, stock: 4, isFeatured: true, rating: 4.7, image: photos.sofa, description: 'Hardwood frame with high-resilience foam and removable, washable covers.' }),
  make('Garden Tool Set with Carry Bag (8 pcs)', 'home-and-garden', 6499, { unitsSold: 52, rating: 4.6, image: photos.garden, description: 'Forged stainless heads on hardwood handles in a waxed canvas bag.' }),
  make('Non-Stick Cookware Set (10 pcs)', 'home-and-garden', 18999, { compareAtPrice: 23999, unitsSold: 39, rating: 4.8, image: photos.kitchen, description: 'PFOA-free granite coating with induction bases and glass lids.' }),
  make('Cotton Percale Bedding Set (King)', 'home-and-garden', 11499, { unitsSold: 47, stock: 18, rating: 4.7, image: photos.bedding, description: '300-thread-count long-staple cotton that breathes easily.' }),
];

const startersBanners = [
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

export async function populateFullDatabase() {
  const Category = getCategory();
  const Product = getProduct();
  const ProductColor = getProductColor();
  const User = getUser();
  const Banner = getBanner();

  console.log('🌱 Populating database with complete catalogue...');

  // 1. Categories
  for (const c of categoriesSeed) {
    const existing = await Category.findOne({ where: { slug: c.slug } });
    if (!existing) {
      await Category.create(c);
    }
  }
  const allCats = await Category.findAll();
  const catMap = Object.fromEntries(allCats.map((c) => [c.slug, c.id]));

  // 2. Admins
  const existingAdmin = await User.findOne({ where: { email: 'admin@wondercart.pk' } });
  if (!existingAdmin) {
    const admin = User.build({
      name: process.env.ADMIN_NAME || 'Store Admin',
      email: process.env.ADMIN_EMAIL || 'admin@wondercart.pk',
      role: 'admin',
    });
    await admin.setPassword(process.env.ADMIN_PASSWORD || 'admin12345');
    await admin.save();
  }

  const extraAdminEmail = process.env.EXTRA_ADMIN_EMAIL || 'support-admin@wondercart.pk';
  const existingAhsan = await User.findOne({ where: { email: extraAdminEmail } });
  if (!existingAhsan) {
    const ahsan = User.build({
      name: process.env.EXTRA_ADMIN_NAME || 'Support Admin',
      email: extraAdminEmail,
      role: 'admin',
      phone: process.env.EXTRA_ADMIN_PHONE || '03038164288',
    });
    await ahsan.setPassword(process.env.EXTRA_ADMIN_PASSWORD || 'SupportAdmin12345');
    await ahsan.save();
  }

  // 3. Demo Shop Manager
  const managerEmail = process.env.SHOP_MANAGER_EMAIL || 'manager@wondercart.pk';
  const existingManager = await User.findOne({ where: { email: managerEmail } });
  if (!existingManager) {
    const manager = User.build({
      name: process.env.SHOP_MANAGER_NAME || 'Demo Shop Manager',
      email: managerEmail,
      role: 'shopmanager',
      isActive: true,
    });
    await manager.setPassword(process.env.SHOP_MANAGER_PASSWORD || 'manager123');
    await manager.save();
    if (catMap['electronics']) {
      await manager.setAssignedCategories([catMap['electronics']]);
    }
  }

  // 4. Demo Customer
  const demoCustEmail = process.env.DEMO_CUSTOMER_EMAIL || 'customer@wondercart.pk';
  const existingClient = await User.findOne({ where: { email: demoCustEmail } });
  if (!existingClient) {
    const client = User.build({
      name: process.env.DEMO_CUSTOMER_NAME || 'Demo Customer',
      email: demoCustEmail,
      role: 'client',
      phone: process.env.DEMO_CUSTOMER_PHONE || '03001234567',
    });
    await client.setPassword(process.env.DEMO_CUSTOMER_PASSWORD || 'Customer12345');
    await client.save();
  }

  // 5. Products & Colors
  for (const p of productsSeed) {
    let prod = await Product.findOne({ where: { slug: p.slug } });
    if (!prod) {
      const isFlash = p.isFlashSale ?? (p.compareAtPrice > p.price);
      prod = await Product.create({
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand,
        categoryId: catMap[p.catSlug] || allCats[0]?.id,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        images: [p.image],
        stock: p.stock,
        rating: p.rating || 4.5,
        numReviews: p.numReviews || 12,
        unitsSold: p.unitsSold || 0,
        isFeatured: p.isFeatured || false,
        isFlashSale: isFlash,
        isActive: true,
      });

      if (p.colors?.length) {
        await ProductColor.bulkCreate(
          p.colors.map((c) => ({ ...c, productId: prod.id }))
        );
      }
    }
  }

  // 6. Starter Banners
  const bannerCount = await Banner.count();
  if (bannerCount === 0) {
    await Banner.bulkCreate(startersBanners);
  }

  console.log('✅ Full database seed finished successfully.');
}

export async function autoSeedIfEmpty() {
  try {
    const Category = getCategory();
    if (!Category) return;

    const catCount = await Category.count();
    if (catCount === 0) {
      await populateFullDatabase();
    }
  } catch (err) {
    console.error('⚠️ Auto-seed error (non-fatal):', err.message);
  }
}
