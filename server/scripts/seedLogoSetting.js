import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { getSetting } from '../models/Setting.js';

async function updateDatabaseLogo() {
  try {
    console.log('Connecting to MySQL database on Hostinger (193.203.166.165:3306)...');
    const sequelize = await connectDB({ skipAutoSeed: true });
    if (!sequelize) {
      throw new Error('Database connection failed');
    }

    const Setting = getSetting();
    const settings = await Setting.getInstance();

    settings.siteName = 'WonderCart';
    settings.logoUrl = '/assets/WonderCart.png';
    await settings.save();

    console.log('✅ Database updated successfully with logo:');
    console.log('   - Site Name:', settings.siteName);
    console.log('   - Logo URL:', settings.logoUrl);
    console.log('   - JazzCash Phone:', settings.jazzcashPhone);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update logo in database:', err);
    process.exit(1);
  }
}

updateDatabaseLogo();
