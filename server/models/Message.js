import { DataTypes } from 'sequelize';

let Message;

/**
 * A message sent from the public "Contact us" form.
 */
export function defineMessage(sequelize) {
  Message = sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: false,
        set(val) {
          this.setDataValue('email', String(val || '').toLowerCase().trim());
        },
      },
      subject: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /** Optional — lets a shopper point at the order they are asking about. */
      orderNumber: {
        type: DataTypes.STRING(40),
        defaultValue: '',
        field: 'order_number',
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read',
      },
      /** Set when a signed-in customer writes, so the admin knows who they are. */
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: null,
        field: 'user_id',
      },
    },
    {
      tableName: 'messages',
      timestamps: true,
      underscored: true,
    }
  );

  const originalToJSON = Message.prototype.toJSON;
  Message.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    json.user = json.userId;
    return json;
  };

  return Message;
}

export function getMessage() {
  return Message;
}

export default defineMessage;
