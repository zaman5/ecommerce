import { DataTypes } from 'sequelize';

let Review;

export function defineReview(sequelize) {
  Review = sequelize.define(
    'Review',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      comment: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      // True when this reviewer actually bought the product (delivered order).
      verifiedPurchase: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'verified_purchase',
      },
    },
    {
      tableName: 'reviews',
      timestamps: true,
      underscored: true,
      // One review per product per customer
      indexes: [
        {
          unique: true,
          fields: ['product_id', 'user_id'],
        },
      ],
    }
  );

  const originalToJSON = Review.prototype.toJSON;
  Review.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    json.product = json.productId;
    json.user = json.userId;
    return json;
  };

  return Review;
}

export function getReview() {
  return Review;
}

export default defineReview;
