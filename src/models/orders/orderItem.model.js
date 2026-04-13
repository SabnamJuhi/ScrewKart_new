// const { Model, DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// class OrderItem extends Model {}

// OrderItem.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     orderId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     productId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     productName: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     quantity: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     priceAtPurchase: {
//       type: DataTypes.DECIMAL(10, 2),
//       allowNull: false,
//     },
//     totalPrice: {
//       type: DataTypes.DECIMAL(10, 2),
//       allowNull: false,
//     },
//     variantId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     variantInfo: {
//       type: DataTypes.JSON, // To store { "color": "Red", "size": "XL" }
//       allowNull: true,
//     },
//   },
//   {
//     sequelize,
//     modelName: "OrderItem",
//     tableName: "order_items",
//   },
// );

// module.exports = OrderItem;





const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class OrderItem extends Model {}

OrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /* 🔥 PRICE SNAPSHOT */
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    gstRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    gstPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    finalPerUnit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    /* 🔥 TOTALS */
    subTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    taxTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    /* 🔥 SNAPSHOTS */
    productSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    variantSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    /* 🔥 FLEXIBLE DATA */
    variantInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "OrderItem",
    tableName: "order_items",
  }
);

module.exports = OrderItem;