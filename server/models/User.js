import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

let User;

export function defineUser(sequelize) {
  User = sequelize.define(
    'User',
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        set(val) {
          this.setDataValue('email', String(val || '').toLowerCase().trim());
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      role: {
        type: DataTypes.ENUM('client', 'admin', 'shopmanager'),
        defaultValue: 'client',
      },
      phone: {
        type: DataTypes.STRING(50),
        defaultValue: '',
      },
      // Address fields flattened (was embedded sub-document)
      addressLine1: {
        type: DataTypes.STRING(500),
        defaultValue: '',
        field: 'address_line1',
      },
      addressCity: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'address_city',
      },
      addressProvince: {
        type: DataTypes.STRING(255),
        defaultValue: '',
        field: 'address_province',
      },
      addressPostalCode: {
        type: DataTypes.STRING(20),
        defaultValue: '',
        field: 'address_postal_code',
      },
      addressPhone: {
        type: DataTypes.STRING(50),
        defaultValue: '',
        field: 'address_phone',
      },
      // Admin can disable a shop manager without deleting the account.
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      underscored: true,
    }
  );

  // Virtual: set a plain password, get it hashed automatically
  User.prototype.setPassword = async function (plain) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(plain, salt);
  };

  User.prototype.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
  };

  User.prototype.toSafeJSON = function () {
    const idStr = this.id.toString();
    const safe = {
      id: idStr,
      _id: idStr,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      address: {
        line1: this.addressLine1 || '',
        city: this.addressCity || '',
        province: this.addressProvince || '',
        postalCode: this.addressPostalCode || '',
        phone: this.addressPhone || '',
      },
      createdAt: this.createdAt,
    };
    if (this.role === 'shopmanager') {
      safe.assignedCategories = (this.assignedCategories || []).map((c) =>
        (c.id || c._id || c).toString()
      );
      safe.assignedProducts = (this.assignedProducts || []).map((p) =>
        (p.id || p._id || p).toString()
      );
      safe.isActive = this.isActive;
    }
    return safe;
  };

  return User;
}

export function getUser() {
  return User;
}

export default defineUser;
