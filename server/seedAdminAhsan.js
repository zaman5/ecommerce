import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import { getUser } from './models/User.js';

async function seedAdminAhsan() {
  const sequelize = await connectDB();
  if (!sequelize) {
    console.error('Could not connect to database.');
    process.exit(1);
  }
  const User = getUser();

  const email = 'ahsan@wondercart.pk';
  const password = 'Ahsan@Ahmad123';
  const name = 'Ahsan Admin';
  const phone = '03038164288';

  const passwordHash = await bcrypt.hash(password, 10);

  let user = await User.findOne({ where: { email } });
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

  console.log('Done.');
  process.exit(0);
}

seedAdminAhsan().catch((err) => {
  console.error('Error seeding admin Ahsan:', err);
  process.exit(1);
});
