/**
 * Normalises product photography so every picture on a product actually shows
 * that product.
 *
 * This script used to *invent* galleries: it appended two stock photos from the
 * product's department to every product, then cycled those photos onto the
 * colour swatches. With one product per sub-category that could never be right
 * — the "fashion" pool is a teal handbag and a suede shoe, so the red leather
 * shoulder bag advertised both as extra angles, its "Navy" swatch showed a
 * different bag and its "Beige" swatch showed a shoe. Choosing a colour then
 * swapped the main photo to that unrelated product.
 *
 * So it now removes that damage instead of causing it:
 *
 *   - pool photos are stripped from `images`, leaving each product with its own
 *     genuine photo (and any real ones an admin has uploaded since — those are
 *     matched by URL, so they survive);
 *   - every `colors[].image` is cleared. A colour swatch photo has to be real
 *     photography *of that colour*; anything else misrepresents what the
 *     customer is ordering. Cleared, the storefront draws the colour chip from
 *     `hex` and leaves the main photo alone, which the client already handles.
 *
 * ADDITIVE and idempotent — running it twice changes nothing the second time.
 * Run after the catalogue seeds:
 *
 *   npm run seed               # school catalogue (wipes)
 *   npm run seed:marketplace   # marketplace departments
 *   npm run seed:subcategories # category tree
 *   npm run seed:gallery       # this file
 *
 * Restoring a real multi-photo gallery needs real photography: add the extra
 * shots to a product's `images` through the admin product editor, and set a
 * colour's photo only when it pictures that colour.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Product from './models/Product.js';

const img = (id) => `https://images.unsplash.com/photo-${id}?w=700&q=80`;

/**
 * Every photo this script previously injected, by department. Kept only so the
 * damage can be recognised and removed — nothing here is written to a product.
 */
const RETIRED_POOL = {
  'school-bags': ['1548036328-c9fa89d128fa', '1622560480605-d83c853bc5c3'],
  'lunch-boxes': ['1596755094514-f87e34085b2c', '1577401239170-897942555fb3'],
  'water-bottles': ['1602143407151-7111542de6e8', '1523275335684-37898b6baf30'],
  stationery: ['1531346878377-a5be20888e57', '1574944558125-f8d12f23be89'],
  'notebooks-diaries': ['1497633762265-9d179a990aa6', '1531346878377-a5be20888e57'],
  'art-craft': ['1513542789411-b6a5d4f31634', '1452860606245-08befc0ff44b'],
  'educational-toys': ['1587654780291-39c9404d746b', '1622560480605-d83c853bc5c3'],
  'mobile-cases': ['1601593346740-925612772716', '1511707171634-5f897ff02aa9'],
  electronics: ['1491637639811-60e2756cc1c7', '1550258987-190a2d41a8ba'],
  fashion: ['1594223274512-ad4803739b7c', '1560343090-f0409e92791a'],
  'collectibles-and-art': ['1583394838336-acd977736f90', '1542291026-7eec264c27ff'],
  sports: ['1526170375885-4d8ecf77b99f', '1572635196237-14b3f281503f'],
  'health-and-beauty': ['1585386959984-a4155224a1ad', '1600185365483-26d7a4cc7519'],
  'home-and-garden': ['1556906781-9a412961c28c', '1595950653106-6c9ebd614d3a'],
};

const FALLBACK_POOL = ['1511499767150-a48a237f0083', '1608231387042-66d1773070a5'];

const INJECTED = new Set(
  [...Object.values(RETIRED_POOL).flat(), ...FALLBACK_POOL].map(img)
);

async function run() {
  await connectDB(process.env.MONGO_URI);

  const products = await Product.find();
  let galleriesTrimmed = 0;
  let photosRemoved = 0;
  let swatchesCleared = 0;

  for (const p of products) {
    const original = p.images || [];
    // A product's own photo is always first; only the injected ones go. Any
    // genuine extra shot an admin uploaded isn't in the set, so it stays.
    const images = original.filter((url) => !INJECTED.has(url));
    const colors = (p.colors || []).map((c) => ({ name: c.name, hex: c.hex, image: '' }));

    const removed = original.length - images.length;
    const cleared = (p.colors || []).filter((c) => c.image).length;
    if (!removed && !cleared) continue;

    photosRemoved += removed;
    swatchesCleared += cleared;
    if (removed) galleriesTrimmed++;

    await Product.updateOne({ _id: p._id }, { $set: { images, colors } });
  }

  console.log('\n✅ Product photos normalised');
  console.log(`   ${photosRemoved} mismatched photo(s) removed from ${galleriesTrimmed} product(s)`);
  console.log(`   ${swatchesCleared} colour swatch(es) reset to a colour chip`);
  if (!photosRemoved && !swatchesCleared) console.log('   (nothing to do — already clean)');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
