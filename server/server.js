import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
});
