import Category from '../models/Category.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Banner from '../models/Banner.js';

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
  football: img('1461896836934-ffe607ba8211'),
  cosmetics: img('1596462502278-27bfdc403348'),
  sofa: img('1555041469-a586c61ea9bc'),
};

const initialCategories = [
  { name: 'Electronics', slug: 'electronics', image: photos.headphones, description: 'Phones, laptops, audio and wearables.' },
  { name: 'Fashion', slug: 'fashion', image: photos.clothing, description: 'Clothing, footwear, watches and bags.' },
  { name: 'Collectibles & Art', slug: 'collectibles-and-art', image: photos.vintageCamera, description: 'Prints, coins, vinyl and vintage finds.' },
  { name: 'Sports', slug: 'sports', image: photos.football, description: 'Kit for the pitch, gym, road and mat.' },
  { name: 'Health & Beauty', slug: 'health-and-beauty', image: photos.cosmetics, description: 'Skincare, haircare, fragrance and essentials.' },
  { name: 'Home & Garden', slug: 'home-and-garden', image: photos.sofa, description: 'Furniture, kitchen, bedding and garden.' },
];

export async function autoSeedIfEmpty() {
  try {
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      console.log('🌱 Database is empty. Seeding initial categories and admin...');
      
      // Seed Categories
      const createdCats = await Category.insertMany(initialCategories);
      const catMap = {};
      createdCats.forEach((c) => {
        catMap[c.slug] = c._id;
      });

      // Seed Admin user
      const existingAdmin = await User.findOne({ email: 'ahsan@wondercart.pk' });
      if (!existingAdmin) {
        const admin = new User({
          name: 'Ahsan Ahmad',
          email: 'ahsan@wondercart.pk',
          role: 'admin',
          phone: '+92 300 1234567',
        });
        await admin.setPassword('Ahsan@Ahmad123');
        await admin.save();
        console.log('✅ Created default admin: ahsan@wondercart.pk');
      }

      // Seed demo products
      const demoProducts = [
        {
          name: 'Wireless Over-Ear Headphones (ANC)',
          slug: 'wireless-over-ear-headphones-anc',
          category: catMap['electronics'],
          price: 12999,
          compareAtPrice: 15999,
          images: [photos.headphones],
          stock: 25,
          rating: 4.8,
          numReviews: 12,
          unitsSold: 74,
          isFeatured: true,
          description: 'Active noise cancelling with 40 hours of playback on one charge.',
        },
        {
          name: '14" Thin & Light Laptop (16GB RAM)',
          slug: '14-thin-light-laptop-16gb-ram',
          category: catMap['electronics'],
          price: 149999,
          compareAtPrice: 169999,
          images: [photos.laptop],
          stock: 9,
          rating: 4.7,
          numReviews: 8,
          unitsSold: 18,
          isFeatured: true,
          description: '16GB RAM and 512GB SSD in a 1.3kg aluminum body.',
        },
        {
          name: 'Everyday Cotton Crew T-Shirt',
          slug: 'everyday-cotton-crew-t-shirt',
          category: catMap['fashion'],
          price: 1899,
          compareAtPrice: 2499,
          images: [photos.clothing],
          stock: 50,
          rating: 4.6,
          numReviews: 15,
          unitsSold: 132,
          isFeatured: true,
          description: 'Mid-weight combed cotton that keeps its shape after washing.',
        },
      ];

      await Product.insertMany(demoProducts);
      console.log('✅ Initial database seed completed automatically.');
    }
  } catch (err) {
    console.error('⚠️ Auto-seed error (non-fatal):', err.message);
  }
}
