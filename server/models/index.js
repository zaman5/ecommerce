/**
 * Central model registry. Imports every model definition, calls its `define`
 * function against the shared Sequelize instance, then wires up all the
 * associations in one place so circular-dependency headaches are impossible.
 */
import { defineUser } from './User.js';
import { defineCategory } from './Category.js';
import { defineProduct } from './Product.js';
import { defineOrder } from './Order.js';
import { defineBanner } from './Banner.js';
import { defineFlashSale } from './FlashSale.js';
import { defineMessage } from './Message.js';
import { defineReview } from './Review.js';
import { defineSetting } from './Setting.js';
import { defineEmailTemplate } from './EmailTemplate.js';

let sequelizeInstance = null;
let models = {};

export function initModels(sequelize) {
  if (sequelizeInstance === sequelize) return models; // already initialised
  sequelizeInstance = sequelize;

  // --- Define all models ---
  const User = defineUser(sequelize);
  const Category = defineCategory(sequelize);
  const { Product, ProductColor } = defineProduct(sequelize);
  const { Order, OrderItem, OrderTracking } = defineOrder(sequelize);
  const Banner = defineBanner(sequelize);
  const FlashSale = defineFlashSale(sequelize);
  const Message = defineMessage(sequelize);
  const Review = defineReview(sequelize);
  const Setting = defineSetting(sequelize);
  const { EmailTemplate, EmailAttachment } = defineEmailTemplate(sequelize);

  // --- Associations ---

  // Category self-reference (parent/children)
  Category.belongsTo(Category, { as: 'parentCategory', foreignKey: 'parentId' });
  Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });

  // Product belongs to Category
  Product.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });
  Category.hasMany(Product, { foreignKey: 'categoryId' });

  // Product has many colors
  Product.hasMany(ProductColor, { as: 'colors', foreignKey: 'productId', onDelete: 'CASCADE' });
  ProductColor.belongsTo(Product, { foreignKey: 'productId' });

  // Order belongs to User
  Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  User.hasMany(Order, { foreignKey: 'userId' });

  // Order has many items
  Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

  // Order has many tracking events
  Order.hasMany(OrderTracking, { as: 'tracking', foreignKey: 'orderId', onDelete: 'CASCADE' });
  OrderTracking.belongsTo(Order, { foreignKey: 'orderId' });

  // Message belongs to User (optional)
  Message.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  // Review belongs to Product and User
  Review.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
  Review.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Product.hasMany(Review, { foreignKey: 'productId' });
  User.hasMany(Review, { foreignKey: 'userId' });

  // EmailTemplate has many attachments
  EmailTemplate.hasMany(EmailAttachment, { as: 'attachments', foreignKey: 'templateId', onDelete: 'CASCADE' });
  EmailAttachment.belongsTo(EmailTemplate, { foreignKey: 'templateId' });

  // Shop manager scoping — many-to-many through join tables
  const UserAssignedCategory = sequelize.define(
    'UserAssignedCategory',
    {
      userId: {
        type: sequelize.constructor.DataTypes.INTEGER.UNSIGNED,
        field: 'user_id',
        primaryKey: true,
      },
      categoryId: {
        type: sequelize.constructor.DataTypes.INTEGER.UNSIGNED,
        field: 'category_id',
        primaryKey: true,
      },
    },
    { tableName: 'user_assigned_categories', timestamps: false, underscored: true }
  );

  const UserAssignedProduct = sequelize.define(
    'UserAssignedProduct',
    {
      userId: {
        type: sequelize.constructor.DataTypes.INTEGER.UNSIGNED,
        field: 'user_id',
        primaryKey: true,
      },
      productId: {
        type: sequelize.constructor.DataTypes.INTEGER.UNSIGNED,
        field: 'product_id',
        primaryKey: true,
      },
    },
    { tableName: 'user_assigned_products', timestamps: false, underscored: true }
  );

  User.belongsToMany(Category, { as: 'assignedCategories', through: UserAssignedCategory, foreignKey: 'userId', otherKey: 'categoryId' });
  Category.belongsToMany(User, { as: 'assignedManagers', through: UserAssignedCategory, foreignKey: 'categoryId', otherKey: 'userId' });

  User.belongsToMany(Product, { as: 'assignedProducts', through: UserAssignedProduct, foreignKey: 'userId', otherKey: 'productId' });
  Product.belongsToMany(User, { as: 'assignedManagers', through: UserAssignedProduct, foreignKey: 'productId', otherKey: 'userId' });

  models = {
    User,
    Category,
    Product,
    ProductColor,
    Order,
    OrderItem,
    OrderTracking,
    Banner,
    FlashSale,
    Message,
    Review,
    Setting,
    EmailTemplate,
    EmailAttachment,
    UserAssignedCategory,
    UserAssignedProduct,
  };

  return models;
}

export function getModels() {
  return models;
}

export function getSequelize() {
  return sequelizeInstance;
}
