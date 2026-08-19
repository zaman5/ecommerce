/**
 * Removes the accounts, orders and reviews left behind by the QA scripts.
 *
 * The end-to-end tests register a throwaway shopper (`qa-flow-<stamp>@…`) and
 * place real orders as them. Their own cleanup step restores stock and deletes
 * the review, but an interrupted run — or one that asserts before reaching the
 * end — leaves the account and its orders in the database, where they inflate
 * the admin dashboard's revenue and customer counts.
 *
 * Matches only the generated test addresses, so real customers are never
 * touched. Safe to run repeatedly.
 *
 *   npm run cleanup:test
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Order from './models/Order.js';
import Review from './models/Review.js';

// Every address the QA scripts generate. Anchored so a real customer who
// happens to have "qa" in their address is never caught by it.
const TEST_EMAIL = /^(qa-flow-\d+|qa-admin-\d+|x\d+|dup\d*)@(example\.com|e\.com)$/i;

async function run() {
  await connectDB(process.env.MONGO_URI);

  const users = (await User.find().select('_id email')).filter((u) => TEST_EMAIL.test(u.email));
  const ids = users.map((u) => u._id);

  // Guest checkouts placed by the tests carry the same addresses but no account.
  const guestOrders = (await Order.find().select('_id guestEmail user')).filter(
    (o) => o.guestEmail && TEST_EMAIL.test(o.guestEmail)
  );

  const orderIds = [
    ...(await Order.find({ user: { $in: ids } }).select('_id')).map((o) => o._id),
    ...guestOrders.map((o) => o._id),
  ];

  const reviews = await Review.deleteMany({ user: { $in: ids } });
  const orders = await Order.deleteMany({ _id: { $in: orderIds } });
  const accounts = await User.deleteMany({ _id: { $in: ids } });

  console.log('\n✅ Test data cleaned');
  console.log(`   ${accounts.deletedCount} account(s), ${orders.deletedCount} order(s), ${reviews.deletedCount} review(s)`);
  if (users.length) console.log(`   removed: ${users.map((u) => u.email).join(', ')}`);
  if (!accounts.deletedCount && !orders.deletedCount) console.log('   (nothing to do — already clean)');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
