import { DataTypes } from 'sequelize';

let Category;

export function defineCategory(sequelize) {
  Category = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        set(val) {
          this.setDataValue('slug', String(val || '').toLowerCase().trim());
        },
      },
      description: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      image: {
        type: DataTypes.STRING(1000),
        defaultValue: '',
      },
      // Null for a top-level department.
      parentId: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: null,
        field: 'parent_id',
        references: {
          model: 'categories',
          key: 'id',
        },
      },
    },
    {
      tableName: 'categories',
      timestamps: true,
      underscored: true,
    }
  );

  const originalToJSON = Category.prototype.toJSON;
  Category.prototype.toJSON = function () {
    const json = originalToJSON.call(this);
    if (json.id) {
      json._id = json.id.toString();
    }
    return json;
  };

  return Category;
}

export function getCategory() {
  return Category;
}

export default defineCategory;
