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
