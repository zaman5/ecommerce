import 'dotenv/config';
import { connectDB } from './config/db.js';
import { getProduct, getProductColor } from './models/Product.js';
import { getCategory } from './models/Category.js';

const products = [
  // School Essentials
  {
    name: 'Ergonomic Waterproof Kids School Backpack',
    slug: 'ergonomic-waterproof-kids-school-backpack',
    catSlug: 'school-essentials',
    price: 3499,
    compareAtPrice: 4299,
    brand: 'WonderCart',
    stock: 45,
    rating: 4.9,
    numReviews: 38,
    unitsSold: 120,
    isFeatured: true,
    isFlashSale: true,
    image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=600&q=80',
    description: 'Ergonomic lightweight backpack with reflective safety strips, padded straps, and waterproof material. Ideal for primary & middle school students.',
  },
  {
    name: 'Cute Cartoon Multi-Layer Pencil Case',
    slug: 'cute-cartoon-multi-layer-pencil-case',
    catSlug: 'pencil-cases',
    price: 899,
    compareAtPrice: 1199,
    brand: 'WonderCart',
    stock: 60,
    rating: 4.8,
    numReviews: 24,
    unitsSold: 85,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&q=80',
    description: 'Large capacity 3D pencil pouch with multiple compartments for pens, stationery, and small accessories.',
  },
  {
    name: 'Stainless Steel Insulated Kids Water Bottle 500ml',
    slug: 'stainless-steel-insulated-kids-water-bottle-500ml',
    catSlug: 'school-water-bottles',
    price: 1599,
    compareAtPrice: 1999,
    brand: 'WonderCart',
    stock: 35,
    rating: 4.7,
    numReviews: 19,
    unitsSold: 92,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80',
    description: 'Double-walled vacuum insulated bottle keeps drinks cold for 24h or warm for 12h. BPA-free leakproof straw lid.',
  },
  {
    name: 'Leakproof 4-Compartment Kids Bento Lunch Box',
    slug: 'leakproof-4-compartment-kids-bento-lunch-box',
    catSlug: 'lunch-boxes',
    price: 1899,
    compareAtPrice: 2499,
    brand: 'WonderCart',
    stock: 40,
    rating: 4.9,
    numReviews: 31,
    unitsSold: 110,
    isFeatured: true,
    isFlashSale: true,
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&q=80',
    description: 'BPA-free microwave-safe bento box with separate compartments and silicone seals to prevent spills and keep food fresh.',
  },

  // Toys & Fun
  {
    name: 'Magnetic Building Blocks Set (60 Pcs)',
    slug: 'magnetic-building-blocks-set-60-pcs',
    catSlug: 'educational-toys',
    price: 2999,
    compareAtPrice: 3899,
    brand: 'WonderCart',
    stock: 30,
    rating: 4.9,
    numReviews: 42,
    unitsSold: 95,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&q=80',
    description: 'STEM educational 3D magnetic tile set that promotes creativity, cognitive development, and spatial reasoning in kids.',
  },
  {
    name: 'Pop-It Sensory Fidget Toy Board',
    slug: 'pop-it-sensory-fidget-toy-board',
    catSlug: 'squeeze-sensory-toys',
    price: 599,
    compareAtPrice: 799,
    brand: 'WonderCart',
    stock: 80,
    rating: 4.6,
    numReviews: 15,
    unitsSold: 140,
    isFeatured: false,
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=600&q=80',
    description: 'High quality food-grade silicone bubble sensory board for stress relief and focus.',
  },

  // Learning & Stationery
  {
    name: 'Kids Acrylic Color & Sketch Art Kit (48 Pcs)',
    slug: 'kids-acrylic-color-and-sketch-art-kit',
    catSlug: 'art-craft',
    price: 2199,
    compareAtPrice: 2799,
    brand: 'WonderCart',
    stock: 28,
    rating: 4.8,
    numReviews: 22,
    unitsSold: 64,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&q=80',
    description: 'All-in-one deluxe art set with washable markers, crayons, colored pencils, and watercolor paints.',
  },

  // Newborn & Baby
  {
    name: 'Soft Organic Cotton Baby Onesie & Beanie Set',
    slug: 'soft-organic-cotton-baby-onesie-and-beanie-set',
    catSlug: 'newborn-baby',
    price: 1499,
    compareAtPrice: 1899,
    brand: 'WonderCart',
    stock: 50,
    rating: 4.9,
    numReviews: 28,
    unitsSold: 88,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80',
    description: 'Ultra-gentle 100% breathable organic cotton newborn set with nickel-free snaps and matching beanie.',
  },

  // Teen Girls
  {
    name: 'Aesthetic Pastel Crossbody Bag with Cute Charm',
    slug: 'aesthetic-pastel-crossbody-bag-with-cute-charm',
    catSlug: 'teen-girls',
    price: 2499,
    compareAtPrice: 2999,
    brand: 'WonderCart',
    stock: 25,
    rating: 4.8,
    numReviews: 17,
    unitsSold: 53,
    isFeatured: true,
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
    description: 'Trendy casual shoulder bag with adjustable strap, waterproof fabric, and acrylic bear charm.',
  },

  // Gifts for Kids
  {
    name: 'Magical LED Night Light & Bluetooth Speaker',
    slug: 'magical-led-night-light-and-bluetooth-speaker',
    catSlug: 'gifts-for-kids',
    price: 2799,
    compareAtPrice: 3499,
    brand: 'WonderCart',
    stock: 35,
    rating: 4.9,
    numReviews: 36,
    unitsSold: 77,
    isFeatured: true,
    isFlashSale: true,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80',
    description: 'Multi-color touch ambient night light with built-in high definition Bluetooth speaker and soothing sounds.',
  }
];

async function seed() {
  const seq = await connectDB({ skipAutoSeed: true });
  if (!seq) process.exit(1);

  const Category = getCategory();
  const Product = getProduct();
  const ProductColor = getProductColor();

  const allCats = await Category.findAll();
  const catMap = Object.fromEntries(allCats.map(c => [c.slug, c.id]));
  const defaultCatId = allCats[0]?.id;

  console.log('Inserting sample products...');
  for (const p of products) {
    const categoryId = catMap[p.catSlug] || defaultCatId;
    const [prod, created] = await Product.findOrCreate({
      where: { slug: p.slug },
      defaults: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand,
        categoryId: categoryId,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        images: [p.image],
        stock: p.stock,
        rating: p.rating,
        numReviews: p.numReviews,
        unitsSold: p.unitsSold,
        isFeatured: p.isFeatured,
        isFlashSale: p.isFlashSale || false,
        flashSaleDiscount: p.isFlashSale ? 20 : 0,
      }
    });

    if (created) {
      await ProductColor.create({
        productId: prod.id,
        name: 'Pastel Blue',
        hex: '#e0f2fe',
        image: p.image,
      });
      await ProductColor.create({
        productId: prod.id,
        name: 'Pastel Pink',
        hex: '#fce7f3',
        image: p.image,
      });
    }
  }

  console.log('✅ Products successfully seeded!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
