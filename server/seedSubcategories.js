import 'dotenv/config';
import { connectDB } from './config/db.js';
import { getCategory } from './models/Category.js';
import { getProduct } from './models/Product.js';

const TREE = {
  electronics: [
    { name: 'Phones', products: ['5g-smartphone-128gb-dual-sim'] },
    { name: 'Laptops', products: ['14-thin-light-laptop-16gb-ram'] },
    { name: 'Headphones', products: ['wireless-over-ear-headphones-anc'] },
    { name: 'Smart Watches', products: ['fitness-smartwatch-with-gps'] },
    { name: 'Chargers & Cables', products: [] },
  ],
  fashion: [
    { name: 'Clothing', products: ['everyday-cotton-crew-t-shirt'] },
    { name: 'Footwear', products: ['low-top-canvas-sneakers'] },
    { name: 'Watches & Jewellery', products: ['stainless-steel-analogue-watch'] },
    { name: 'Bags & Wallets', products: ['structured-leather-shoulder-bag'] },
  ],
  'collectibles-and-art': [
    { name: 'Cameras', products: ['vintage-35mm-film-camera-refurbished'] },
    { name: 'Wall Art', products: ['framed-abstract-canvas-print-60x90cm'] },
    { name: 'Coins & Stamps', products: ['rare-coin-collector-starter-album'] },
    { name: 'Vinyl & Music', products: ['classic-rock-vinyl-lp-bundle-3-records'] },
  ],
  sports: [
    { name: 'Team Sports', products: ['match-grade-football-size-5'] },
    { name: 'Gym & Fitness', products: ['adjustable-dumbbell-set-2-24kg'] },
    { name: 'Cycling', products: ['21-speed-aluminium-mountain-bike'] },
    { name: 'Yoga', products: ['non-slip-yoga-mat-6mm'] },
  ],
  'health-and-beauty': [
    { name: 'Makeup', products: ['everyday-makeup-starter-palette'] },
    { name: 'Skincare', products: ['vitamin-c-brightening-serum-30ml'] },
    { name: 'Fragrance', products: ['eau-de-parfum-amber-oud-100ml'] },
    { name: 'Hair Care', products: ['argan-oil-repair-shampoo-conditioner'] },
  ],
  'home-and-garden': [
    { name: 'Furniture', products: ['three-seater-fabric-sofa'] },
    { name: 'Garden', products: ['garden-tool-set-with-carry-bag-8-pcs'] },
    { name: 'Kitchen', products: ['non-stick-cookware-set-10-pcs'] },
    { name: 'Bedding', products: ['cotton-percale-bedding-set-king'] },
  ],

  'school-bags': [
    { name: 'Backpacks', products: ['classic-two-pocket-school-backpack'] },
    { name: 'Trolley Bags', products: ['wheeled-trolley-school-bag'] },
    { name: 'Pre-School Bags', products: ['mini-pre-school-backpack'] },
    { name: 'Laptop Bags', products: ['laptop-ready-senior-rucksack'] },
  ],
  'lunch-boxes': [
    { name: 'Bento Boxes', products: ['leak-proof-bento-lunch-box'] },
    { name: 'Food Jars', products: ['insulated-stainless-food-jar'] },
    { name: 'Snack Boxes', products: ['three-compartment-snack-box'] },
  ],
  'water-bottles': [
    { name: 'Straw Bottles', products: ['spill-free-straw-water-bottle'] },
    { name: 'Insulated Bottles', products: ['insulated-steel-bottle-500ml'] },
    { name: 'Sports Bottles', products: ['flip-top-sports-bottle-750ml'] },
  ],
  stationery: [
    { name: 'Pencil Cases', products: ['zip-pencil-case-with-pen-loops'] },
    { name: 'Geometry Sets', products: ['12-piece-geometry-box-set'] },
    { name: 'Pens & Pencils', products: ['everyday-ballpoint-pens-10-pack'] },
  ],
  'notebooks-diaries': [
    { name: 'Notebooks', products: ['a4-spiral-ruled-notebook-5-pack'] },
    { name: 'Diaries & Planners', products: ['hardcover-school-diary-planner'] },
    { name: 'Maths Copies', products: ['squared-maths-copy-4-pack'] },
  ],
  'art-craft': [
    { name: 'Colouring', products: ['24-colouring-pencils-tin'] },
    { name: 'Paints', products: ['washable-poster-paint-set-12-colours'] },
    { name: 'Craft Kits', products: ['craft-kit-safety-scissors-glue-tape'] },
  ],
  'educational-toys': [
    { name: 'Puzzles', products: ['wooden-alphabet-puzzle-board'] },
    { name: 'Learning Blocks', products: ['counting-sorting-number-blocks'] },
    { name: 'Building Sets', products: ['build-it-engineering-brick-set-120-pcs'] },
  ],
  'mobile-cases': [
    { name: 'Phone Cases', products: ['shockproof-kids-phone-case', 'cartoon-silicone-phone-case'] },
    { name: 'Tablet Cases', products: ['kids-tablet-case-with-stand'] },
  ],
};

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
  const sequelize = await connectDB();
  if (!sequelize) {
    console.error('Could not connect to database.');
    process.exit(1);
  }
  const Category = getCategory();
  const Product = getProduct();

  let subsMade = 0;
  let moved = 0;
  const missing = [];

  for (const [parentSlug, subs] of Object.entries(TREE)) {
    const parent = await Category.findOne({ where: { slug: parentSlug } });
    if (!parent) {
      console.log(`skip "${parentSlug}" — no such department`);
      continue;
    }
    await parent.update({ parentId: null });

    for (const sub of subs) {
      const subSlug = `${parentSlug}-${slugify(sub.name)}`;
      let subCat = await Category.findOne({ where: { slug: subSlug } });
      if (subCat) {
        await subCat.update({
          name: sub.name,
          parentId: parent.id,
          image: parent.image,
          description: `${sub.name} in ${parent.name}.`,
        });
      } else {
        subCat = await Category.create({
          name: sub.name,
          slug: subSlug,
          parentId: parent.id,
          image: parent.image,
          description: `${sub.name} in ${parent.name}.`,
        });
      }
      subsMade++;

      for (const productSlug of sub.products) {
        const prod = await Product.findOne({ where: { slug: productSlug } });
        if (prod) {
          await prod.update({ categoryId: subCat.id });
          moved++;
        } else {
          missing.push(productSlug);
        }
      }
    }
  }

  const totalCats = await Category.count();
  const tops = await Category.count({ where: { parentId: null } });

  console.log('\n✅ Sub-categories ready');
  console.log(`   ${subsMade} sub-categories upserted · ${moved} products re-filed`);
  console.log(`   tree: ${tops} departments · ${totalCats - tops} sub-categories`);
  if (missing.length) {
    console.log(`\n⚠️  ${missing.length} product slug(s) in the map matched nothing:`);
    missing.forEach((s) => console.log(`   ${s}`));
  }

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
