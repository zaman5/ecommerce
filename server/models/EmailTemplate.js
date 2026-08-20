import { DataTypes } from 'sequelize';

let EmailTemplate, EmailAttachment;

export function defineEmailTemplate(sequelize) {
  EmailTemplate = sequelize.define(
    'EmailTemplate',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM('order_confirmation', 'order_shipped', 'order_delivered'),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      heading: {
        type: DataTypes.STRING(500),
        defaultValue: '',
      },
      subtitle: {
        type: DataTypes.STRING(500),
        defaultValue: '',
      },
      customMessage: {
        type: DataTypes.TEXT,
        defaultValue: '',
        field: 'custom_message',
      },
      closingMessage: {
        type: DataTypes.TEXT,
        defaultValue: '',
        field: 'closing_message',
      },
      footerText: {
        type: DataTypes.STRING(500),
        defaultValue: '',
        field: 'footer_text',
      },
      brandColor: {
        type: DataTypes.STRING(20),
        defaultValue: '#1f6b60',
        field: 'brand_color',
      },
      headerBanner: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
        field: 'header_banner',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      tableName: 'email_templates',
      timestamps: true,
      underscored: true,
    }
  );

  const originalTplToJSON = EmailTemplate.prototype.toJSON;
  EmailTemplate.prototype.toJSON = function () {
    const json = originalTplToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  EmailAttachment = sequelize.define(
    'EmailAttachment',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      templateId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'template_id',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(1000),
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
      size: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'email_attachments',
      timestamps: false,
      underscored: true,
    }
  );

  const originalAttToJSON = EmailAttachment.prototype.toJSON;
  EmailAttachment.prototype.toJSON = function () {
    const json = originalAttToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  return { EmailTemplate, EmailAttachment };
}

export function getEmailTemplate() {
  return EmailTemplate;
}

export function getEmailAttachment() {
  return EmailAttachment;
}

export default defineEmailTemplate;
