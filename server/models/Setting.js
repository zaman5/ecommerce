import { DataTypes } from 'sequelize';

let Setting;

export function defineSetting(sequelize) {
  Setting = sequelize.define(
    'Setting',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      // Singleton key — there is only ever one settings document.
      key: {
        type: DataTypes.STRING(50),
        unique: true,
        defaultValue: 'site',
      },
      // Site branding
      siteName: {
        type: DataTypes.STRING(100),
        defaultValue: 'WonderCart',
        field: 'site_name',
      },
      logoUrl: {
        type: DataTypes.STRING(1000),
        defaultValue: '/uploads/logo.png',
        field: 'logo_url',
      },
      // JazzCash payment configuration shown at checkout
      jazzcashPhone: {
        type: DataTypes.STRING(50),
        defaultValue: '03038164288',
        field: 'jazzcash_phone',
      },
      jazzcashQrImage: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
        field: 'jazzcash_qr_image',
      },
      // Social Media (Facebook & Instagram) configuration
      facebookPageId: {
        type: DataTypes.STRING(100),
        defaultValue: '',
        field: 'facebook_page_id',
      },
      facebookPageAccessToken: {
        type: DataTypes.TEXT,
        defaultValue: '',
        field: 'facebook_page_access_token',
      },
      facebookAutoPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'facebook_auto_post',
      },
      instagramAccountId: {
        type: DataTypes.STRING(100),
        defaultValue: '',
        field: 'instagram_account_id',
      },
      instagramAutoPost: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'instagram_auto_post',
      },
      socialPostTemplate: {
        type: DataTypes.TEXT,
        defaultValue: '✨ New Arrival at WonderCart! ✨\n\n🛍️ {product_name}\n💰 Price: Rs {price}\n{discount_text}\n\n👉 Order now: {product_url}\n\n#WonderCart #BabyShop #OnlineShopping',
        field: 'social_post_template',
      },
    },
    {
      tableName: 'settings',
      timestamps: true,
      underscored: true,
    }
  );

  const originalToJSON = Setting.prototype.toJSON;
  Setting.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  /**
   * Returns the single settings document, creating one with defaults if it
   * doesn't exist yet.
   */
  Setting.getInstance = async function () {
    const [doc] = await Setting.findOrCreate({
      where: { key: 'site' },
      defaults: { key: 'site' },
    });
    return doc;
  };

  return Setting;
}

export function getSetting() {
  return Setting;
}

export default defineSetting;
