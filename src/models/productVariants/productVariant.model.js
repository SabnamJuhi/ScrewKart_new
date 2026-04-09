// // models/productVariant.model.js
// const { Model, DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// class ProductVariant extends Model {}

// ProductVariant.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     productId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     variantCode: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       // unique: true
//     },
//     packQuantity: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },

//     finish: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     grade: {
//       type: DataTypes.DECIMAL(4, 2),
//       allowNull: true,
//     },

//     material: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },

//     threadType: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     totalStock: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//     },
//     stockStatus: {
//       type: DataTypes.STRING,
//       defaultValue: "Out of Stock",
//     },
//     isActive: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//   },
//   {
//     sequelize,
//     tableName: "product_variants",
//   },
// );

// module.exports = ProductVariant;






const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class ProductVariant extends Model {}

ProductVariant.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    productId: { type: DataTypes.INTEGER, allowNull: false },

    variantCode: { type: DataTypes.STRING, allowNull: false },

    // sku: { type: DataTypes.STRING },

    unit: {
      type: DataTypes.ENUM("PCS", "BOX"),
      defaultValue: "PCS",
    },

    moq: { type: DataTypes.INTEGER, defaultValue: 1 },

    packingType: {
      type: DataTypes.ENUM("LOOSE", "BOX"),
    },
    dispatchType: {
      type: DataTypes.ENUM("INSTANT", "CUSTOM"),
      defaultValue: "INSTANT",
    },

    deliverySla: {
      type: DataTypes.STRING, // "2 Days"
    },

    totalStock: { type: DataTypes.INTEGER, defaultValue: 0 },

    stockStatus: {
      type: DataTypes.STRING,
      defaultValue: "Out of Stock",
    },

    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: "product_variants",
  }
);

module.exports = ProductVariant;
