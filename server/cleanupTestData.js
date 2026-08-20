import 'dotenv/config';
import { connectDB } from './config/db.js';
import { getUser } from './models/User.js';
import { getOrder, getOrderItem, getOrderTracking } from './models/Order.js';
import { getReview } from './models/Review.js';
import { Op } from 'sequelize';

const TEST_EMAIL = /^(qa-flow-\d+|qa-admin-\d+|x\d+|dup\d*)@(example\.com|e\.com)$/i;

async function run() {
  const sequelize = await connectDB();
  if (!sequelize) {
    console.error('Could not connect to database.');
    process.exit(1);
  }
  const User = getUser();
  const Order = getOrder();
  const OrderItem = getOrderItem();
  const OrderTracking = getOrderTracking();
  const Review = getReview();

  const allUsers = await User.findAll({ attributes: ['id', 'email'] });
  const users = allUsers.filter((u) => TEST_EMAIL.test(u.email));
  const userIds = users.map((u) => u.id);

  const allOrders = await Order.findAll({ attributes: ['id', 'guestEmail', 'userId'] });
  const testOrders = allOrders.filter(
    (o) => (o.userId && userIds.includes(o.userId)) || (o.guestEmail && TEST_EMAIL.test(o.guestEmail))
  );
  const orderIds = testOrders.map((o) => o.id);

  let reviewsDeleted = 0;
  if (userIds.length) {
    reviewsDeleted = await Review.destroy({ where: { userId: { [Op.in]: userIds } } });
  }

  let ordersDeleted = 0;
  if (orderIds.length) {
    await OrderItem.destroy({ where: { orderId: { [Op.in]: orderIds } } });
    await OrderTracking.destroy({ where: { orderId: { [Op.in]: orderIds } } });
    ordersDeleted = await Order.destroy({ where: { id: { [Op.in]: orderIds } } });
  }

  let accountsDeleted = 0;
  if (userIds.length) {
    accountsDeleted = await User.destroy({ where: { id: { [Op.in]: userIds } } });
  }

  console.log('\n✅ Test data cleaned');
  console.log(`   ${accountsDeleted} account(s), ${ordersDeleted} order(s), ${reviewsDeleted} review(s)`);
  if (users.length) console.log(`   removed: ${users.map((u) => u.email).join(', ')}`);
  if (!accountsDeleted && !ordersDeleted) console.log('   (nothing to do — already clean)');

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
