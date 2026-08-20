import { DataTypes } from 'sequelize';

let FlashSale;

/**
 * Settings for the Flash Sale strip on the home page.
 * Singleton — one row with key='default'.
 */
export function defineFlashSale(sequelize) {
  FlashSale = sequelize.define(
    'FlashSale',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      /** Fixed — enforces "only one" at the database, not just by convention. */
      key: {
        type: DataTypes.STRING(50),
        defaultValue: 'default',
        unique: true,
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_enabled',
      },
      title: {
        type: DataTypes.STRING(80),
        defaultValue: '⚡ Flash Sale',
      },
      countdownMode: {
        type: DataTypes.ENUM('midnight', 'endsAt', 'none'),
        defaultValue: 'midnight',
        field: 'countdown_mode',
      },
      timerLabel: {
        type: DataTypes.STRING(60),
        defaultValue: 'On Sale Ends In',
        field: 'timer_label',
      },
      endsAt: {
        type: DataTypes.DATE,
        defaultValue: null,
        field: 'ends_at',
      },
      ctaLabel: {
        type: DataTypes.STRING(60),
        defaultValue: 'Shop All Deals',
        field: 'cta_label',
      },
      ctaLink: {
        type: DataTypes.STRING(300),
        defaultValue: '/shop?deals=true',
        field: 'cta_link',
      },
      limit: {
        type: DataTypes.INTEGER,
        defaultValue: 12,
      },
      sort: {
        type: DataTypes.ENUM('popular', 'newest', 'priceLow', 'priceHigh', 'rating'),
        defaultValue: 'popular',
      },
    },
    {
      tableName: 'flash_sales',
      timestamps: true,
      underscored: true,
    }
  );

  const originalToJSON = FlashSale.prototype.toJSON;
  FlashSale.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  /** The one document, created on first read so callers never get null. */
  FlashSale.getSettings = async function () {
    const [doc] = await FlashSale.findOrCreate({
      where: { key: 'default' },
      defaults: { key: 'default' },
    });
    return doc;
  };

  return FlashSale;
}

export function getFlashSale() {
  return FlashSale;
}

export default defineFlashSale;
