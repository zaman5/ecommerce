import { DataTypes } from 'sequelize';

let Banner;

/**
 * A promotional slide on the home page carousel.
 */
export function defineBanner(sequelize) {
  Banner = sequelize.define(
    'Banner',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      subtitle: {
        type: DataTypes.STRING(500),
        defaultValue: '',
      },
      /** Background photo. An uploaded "/uploads/…" path or an external URL. */
      image: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
      /** Where the button goes. Internal route ("/shop?deals=true") or full URL. */
      link: {
        type: DataTypes.STRING(1000),
        defaultValue: '/shop',
      },
      ctaLabel: {
        type: DataTypes.STRING(255),
        defaultValue: 'Shop now',
        field: 'cta_label',
      },
      theme: {
        type: DataTypes.ENUM('dark', 'light'),
        defaultValue: 'dark',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order',
      },
    },
    {
      tableName: 'banners',
      timestamps: true,
      underscored: true,
    }
  );

  const originalToJSON = Banner.prototype.toJSON;
  Banner.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  return Banner;
}

export function getBanner() {
  return Banner;
}

export default defineBanner;
