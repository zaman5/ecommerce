import 'dotenv/config';
import { connectDB } from './config/db.js';
import { getCategory } from './models/Category.js';

const CATEGORIES_DATA = [
  {
    name: 'School Essentials',
    slug: 'school-essentials',
    description: 'School bags, lunch boxes, bottles and stationery for all ages',
    subs: [
      { name: 'School Bags', slug: 'school-bags' },
      { name: 'Lunch Boxes', slug: 'school-lunch-boxes' },
      { name: 'Water Bottles', slug: 'school-water-bottles' },
      { name: 'Pencil Cases', slug: 'pencil-cases' },
      { name: 'Geometry & Stationery', slug: 'geometry-stationery' },
    ],
  },
  {
    name: 'Toys & Fun',
    slug: 'toys-fun',
    description: 'Play, learn and grow with exciting toys',
    subs: [
      { name: 'Educational Toys', slug: 'educational-toys' },
      { name: 'Squeeze & Sensory Toys', slug: 'squeeze-sensory-toys' },
      { name: 'Activity Toys', slug: 'activity-toys' },
      { name: 'Outdoor & Fun Toys', slug: 'outdoor-fun-toys' },
    ],
  },
  {
    name: 'Lunch & Mealtime',
    slug: 'lunch-mealtime',
    description: 'Bento boxes, bottles and containers for happy meals',
    subs: [
      { name: 'Lunch Boxes', slug: 'lunch-boxes' },
      { name: 'Bento Boxes', slug: 'bento-boxes' },
      { name: 'Kids Bottles', slug: 'kids-bottles' },
      { name: 'Food Containers', slug: 'food-containers' },
    ],
  },
  {
    name: 'Learning & Stationery',
    slug: 'learning-stationery',
    description: 'Supplies to spark creativity and learning',
    subs: [
      { name: 'Geometry Sets', slug: 'geometry-sets' },
      { name: 'Art & Craft', slug: 'art-craft' },
      { name: 'Writing Supplies', slug: 'writing-supplies' },
      { name: 'Learning Activities', slug: 'learning-activities' },
    ],
  },
  {
    name: 'Kids Care & Essentials',
    slug: 'kids-care-essentials',
    description: 'Comfort, care and daily essentials',
    subs: [
      { name: 'Bath & Body', slug: 'bath-body' },
      { name: 'Personal Care', slug: 'personal-care' },
      { name: 'Kids Accessories', slug: 'kids-accessories' },
      { name: 'Everyday Essentials', slug: 'everyday-essentials' },
    ],
  },
  {
    name: 'Gifts for Kids',
    slug: 'gifts-for-kids',
    description: 'Perfect gifts for every celebration and occasion',
    subs: [
      { name: 'Birthday Gifts', slug: 'birthday-gifts' },
      { name: 'Cute & Fun Gifts', slug: 'cute-fun-gifts' },
      { name: 'Gift Sets', slug: 'gift-sets' },
    ],
  },
  {
    name: 'Newborn & Baby',
    slug: 'newborn-baby',
    description: 'Gentle care and essentials for newborns and infants',
    subs: [
      { name: 'Baby Essentials', slug: 'baby-essentials' },
      { name: 'Feeding & Mealtime', slug: 'baby-feeding-mealtime' },
      { name: 'Baby Care', slug: 'baby-care' },
      { name: 'Baby Toys', slug: 'baby-toys' },
      { name: 'Baby Accessories', slug: 'baby-accessories' },
    ],
  },
  {
    name: 'Teen Girls',
    slug: 'teen-girls',
    description: 'Trendy accessories, lifestyle and essentials for teens',
    subs: [
      { name: 'Bags & Backpacks', slug: 'teen-bags-backpacks' },
      { name: 'Phone Cases & Accessories', slug: 'teen-phone-cases-accessories' },
      { name: 'Cute Gadgets', slug: 'teen-cute-gadgets' },
      { name: 'Jewellery & Accessories', slug: 'teen-jewellery-accessories' },
      { name: 'Beauty & Self-Care', slug: 'teen-beauty-self-care' },
      { name: 'Room & Lifestyle', slug: 'teen-room-lifestyle' },
    ],
  },
  {
    name: 'Gadgets & Tech Accessories',
    slug: 'gadgets-tech-accessories',
    description: 'Smart tech accessories and mini gadgets',
    subs: [
      { name: 'Phone Cases', slug: 'tech-phone-cases' },
      { name: 'Phone Accessories', slug: 'tech-phone-accessories' },
      { name: 'Mini Gadgets', slug: 'tech-mini-gadgets' },
      { name: 'Desk Gadgets', slug: 'tech-desk-gadgets' },
      { name: 'Useful Tech', slug: 'tech-useful-tech' },
    ],
  },
];

async function seed() {
  const sequelize = await connectDB({ skipAutoSeed: true });
  if (!sequelize) {
    console.error('Database connection failed.');
    process.exit(1);
  }
  const Category = getCategory();

  for (const cat of CATEGORIES_DATA) {
    let parent = await Category.findOne({ where: { slug: cat.slug } });
    if (!parent) {
      parent = await Category.create({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: null,
      });
      console.log(`+ Created Category: ${cat.name}`);
    } else {
      await parent.update({ name: cat.name, description: cat.description, parentId: null });
      console.log(`~ Updated Category: ${cat.name}`);
    }

    for (const sub of cat.subs) {
      let subCat = await Category.findOne({ where: { slug: sub.slug } });
      if (!subCat) {
        subCat = await Category.create({
          name: sub.name,
          slug: sub.slug,
          parentId: parent.id,
          description: `${sub.name} in ${cat.name}`,
        });
        console.log(`  + Created Subcategory: ${sub.name}`);
      } else {
        await subCat.update({
          name: sub.name,
          parentId: parent.id,
          description: `${sub.name} in ${cat.name}`,
        });
        console.log(`  ~ Updated Subcategory: ${sub.name}`);
      }
    }
  }

  console.log('✅ Categories & subcategories successfully seeded!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
