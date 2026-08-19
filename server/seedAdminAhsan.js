import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

async function seedAdminAhsan() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wondercart';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('MongoDB connected.');

  const email = 'ahsan@wondercart.pk';
  const password = 'Ahsan@Ahmad123';
  const name = 'Ahsan Admin';
  const phone = '03038164288';

  const passwordHash = await bcrypt.hash(password, 10);

  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.role = 'admin';
    user.passwordHash = passwordHash;
    user.phone = phone;
    user.isActive = true;
    await user.save();
    console.log(`✅ Admin user "${email}" updated successfully with new password!`);
  } else {
    user = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      phone,
      isActive: true,
    });
    console.log(`✅ Admin user "${email}" created successfully!`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seedAdminAhsan().catch((err) => {
  console.error('Error seeding admin Ahsan:', err);
  process.exit(1);
});
