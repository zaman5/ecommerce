import { DataTypes } from 'sequelize';

let Product, ProductColor;

export function defineProduct(sequelize) {
  Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
        set(val) {
          this.setDataValue('slug', String(val || '').toLowerCase().trim());
        },
      },
      description: {
        type: DataTypes.TEXT('long'),
        defaultValue: '',
      },
      brand: {
        type: DataTypes.STRING(255),
        defaultValue: '',
      },
      categoryId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'category_id',
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        get() {
          const val = this.getDataValue('price');
          return val === null ? null : parseFloat(val);
        },
      },
      compareAtPrice: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
        field: 'compare_at_price',
        get() {
          const val = this.getDataValue('compareAtPrice');
          return val === null ? 0 : parseFloat(val);
        },
      },
      // Stored as JSON array of URL strings
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      video: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      rating: {
        type: DataTypes.DECIMAL(3, 1),
        defaultValue: 0,
        get() {
          const val = this.getDataValue('rating');
          return val === null ? 0 : parseFloat(val);
        },
      },
      numReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'num_reviews',
      },
      unitsSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'units_sold',
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_featured',
      },
      isFlashSale: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_flash_sale',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      underscored: true,
    }
  );

  const originalProductToJSON = Product.prototype.toJSON;
  Product.prototype.toJSON = function () {
    const json = originalProductToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    if (!json.images) {
      json.images = [];
    }
    return json;
  };

  // Product colors as a separate table (was embedded sub-document)
  ProductColor = sequelize.define(
    'ProductColor',
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      hex: {
        type: DataTypes.STRING(20),
        defaultValue: '#cccccc',
      },
      image: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
    },
    {
      tableName: 'product_colors',
      timestamps: false,
      underscored: true,
    }
  );

  const originalColorToJSON = ProductColor.prototype.toJSON;
  ProductColor.prototype.toJSON = function () {
    const json = originalColorToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  return { Product, ProductColor };
}

export function getProduct() {
  return Product;
}

export function getProductColor() {
  return ProductColor;
}

export default defineProduct;
