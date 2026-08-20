import { DataTypes } from 'sequelize';

let Order, OrderItem, OrderTracking;

export function defineOrder(sequelize) {
  Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'order_number',
      },
      // Null for guest checkout
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: null,
        field: 'user_id',
      },
      isGuest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_guest',
      },
      guestEmail: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'guest_email',
        set(val) {
          this.setDataValue('guestEmail', String(val || '').toLowerCase().trim());
        },
      },
      guestToken: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'guest_token',
      },
      // Shipping address fields (flattened from embedded sub-document)
      shippingFullName: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'shipping_full_name',
      },
      shippingLine1: {
        type: DataTypes.STRING(500),
        defaultValue: '',
        field: 'shipping_line1',
      },
      shippingCity: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'shipping_city',
      },
      shippingProvince: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'shipping_province',
      },
      shippingPostalCode: {
        type: DataTypes.STRING(20),
        defaultValue: '',
        field: 'shipping_postal_code',
      },
      shippingPhone: {
        type: DataTypes.STRING(50),
        defaultValue: '',
        field: 'shipping_phone',
      },
      itemsTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'items_total',
        get() {
          const val = this.getDataValue('itemsTotal');
          return val === null ? 0 : parseFloat(val);
        },
      },
      shippingFee: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'shipping_fee',
        get() {
          const val = this.getDataValue('shippingFee');
          return val === null ? 0 : parseFloat(val);
        },
      },
      grandTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'grand_total',
        get() {
          const val = this.getDataValue('grandTotal');
          return val === null ? 0 : parseFloat(val);
        },
      },
      paymentMethod: {
        type: DataTypes.ENUM('cod', 'card', 'jazzcash', 'easypaisa'),
        defaultValue: 'cod',
        field: 'payment_method',
      },
      paymentScreenshot: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
        field: 'payment_screenshot',
      },
      paymentStatus: {
        type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
        defaultValue: 'unpaid',
        field: 'payment_status',
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'),
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'orders',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate(order) {
          if (!order.orderNumber) {
            const rand = Math.floor(1000 + Math.random() * 9000);
            order.orderNumber = `BS-${Date.now().toString().slice(-6)}${rand}`;
          }
        },
        beforeValidate(order) {
          if (!order.userId && !order.guestEmail) {
            throw new Error('An order needs either a signed-in customer or a guest email.');
          }
        },
      },
    }
  );

  // Helper to build shippingAddress object from flat columns
  Order.prototype.getShippingAddress = function () {
    return {
      fullName: this.shippingFullName || '',
      line1: this.shippingLine1 || '',
      city: this.shippingCity || '',
      province: this.shippingProvince || '',
      postalCode: this.shippingPostalCode || '',
      phone: this.shippingPhone || '',
    };
  };

  // Custom toJSON that matches the old Mongo shape
  const originalToJSON = Order.prototype.toJSON;
  Order.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    // Build the nested shippingAddress that the frontend expects
    json.shippingAddress = {
      fullName: json.shippingFullName || '',
      line1: json.shippingLine1 || '',
      city: json.shippingCity || '',
      province: json.shippingProvince || '',
      postalCode: json.shippingPostalCode || '',
      phone: json.shippingPhone || '',
    };
    // Remove the flat shipping columns from the JSON
    delete json.shippingFullName;
    delete json.shippingLine1;
    delete json.shippingCity;
    delete json.shippingProvince;
    delete json.shippingPostalCode;
    delete json.shippingPhone;
    // Remove guestToken from default JSON
    delete json.guestToken;
    // Rename items/tracking from association names
    if (json.OrderItems) {
      json.items = json.OrderItems;
      delete json.OrderItems;
    }
    if (json.OrderTrackings) {
      json.tracking = json.OrderTrackings;
      delete json.OrderTrackings;
    }
    return json;
  };

  OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'order_id',
      },
      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        field: 'product_id',
      },
      name: {
        type: DataTypes.STRING(500),
        defaultValue: '',
      },
      slug: {
        type: DataTypes.STRING(500),
        defaultValue: '',
      },
      image: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
      color: {
        type: DataTypes.STRING(100),
        defaultValue: '',
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        get() {
          const val = this.getDataValue('price');
          return val === null ? 0 : parseFloat(val);
        },
      },
      qty: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      tableName: 'order_items',
      timestamps: false,
      underscored: true,
    }
  );

  // Custom toJSON for OrderItem — rename productId to product for compat
  const originalItemToJSON = OrderItem.prototype.toJSON;
  OrderItem.prototype.toJSON = function () {
    const json = originalItemToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    json.product = json.productId;
    return json;
  };

  OrderTracking = sequelize.define(
    'OrderTracking',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'order_id',
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'),
      },
      note: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'order_tracking',
      timestamps: false,
      underscored: true,
    }
  );

  const originalTrackingToJSON = OrderTracking.prototype.toJSON;
  OrderTracking.prototype.toJSON = function () {
    const json = originalTrackingToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  return { Order, OrderItem, OrderTracking };
}

export function getOrder() {
  return Order;
}
export function getOrderItem() {
  return OrderItem;
}
export function getOrderTracking() {
  return OrderTracking;
}

export default defineOrder;
