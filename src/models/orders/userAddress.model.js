// // models/userAddress.model.js
// const { Model, DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// class UserAddress extends Model {}

// UserAddress.init(
//   {
//     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

//     userId: { type: DataTypes.INTEGER, allowNull: false },

//     fullName: { type: DataTypes.STRING, allowNull: false },
//     email: { type: DataTypes.STRING, allowNull: false },
//     phoneNumber: { type: DataTypes.STRING, allowNull: false },
//     addressLine: { type: DataTypes.TEXT, allowNull: false },
//     country: { type: DataTypes.STRING, allowNull: false },
//     city: { type: DataTypes.STRING, allowNull: false },
//     state: { type: DataTypes.STRING, allowNull: false },
//     zipCode: { type: DataTypes.STRING, allowNull: false },

//     // New Google Location Fields
//     latitude: {
//       type: DataTypes.DECIMAL(10, 8),
//       allowNull: true,
//       validate: {
//         min: -90,
//         max: 90
//       }
//     },
//     longitude: {
//       type: DataTypes.DECIMAL(11, 8),
//       allowNull: true,
//       validate: {
//         min: -180,
//         max: 180
//       }
//     },
//     placeId: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       comment: "Google Maps Place ID"
//     },
//     formattedAddress: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//       comment: "Full formatted address from Google"
//     },

//     isDefault: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//   },
//   {
//     sequelize,
//     modelName: "UserAddress",
//     tableName: "user_addresses",
//     timestamps: true,
//   },
// );

// module.exports = UserAddress;

// models/userAddress.model.js


const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class UserAddress extends Model {}

UserAddress.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /* ---------------- CUSTOMER DETAILS ---------------- */
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: { type: DataTypes.STRING, allowNull: false },

    addressType: {
      type: DataTypes.STRING, // Home / Work / Other
      allowNull: true,
    },

    type: {
      type: DataTypes.STRING, // myself / someone_else
      allowNull: true,
    },

    /* ---------------- ADDRESS STRUCTURE ---------------- */

    addressLine: {
      type: DataTypes.TEXT, // short address
      allowNull: false,
    },

    house: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    neighborhood: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    landmark: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    area: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    locality: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    /* ---------------- GOOGLE LOCATION ---------------- */

    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },

    placeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    formattedAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    selectedAddressLine: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /* ---------------- FLAGS ---------------- */

    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "UserAddress",
    tableName: "user_addresses",
    timestamps: true,
  },
);

module.exports = UserAddress;
