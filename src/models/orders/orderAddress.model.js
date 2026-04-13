// const { Model, DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// class OrderAddress extends Model {}

// OrderAddress.init(
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
//     fullName: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     phoneNumber: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     addressLine: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//     },
//      country: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     city: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     state: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     zipCode: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//       // Google Location Fields
//     latitude: { 
//       type: DataTypes.DECIMAL(10, 8), 
//       allowNull: true,
//     },
//     longitude: { 
//       type: DataTypes.DECIMAL(11, 8), 
//       allowNull: true,
//     },
//     placeId: { 
//       type: DataTypes.STRING, 
//       allowNull: true,
//     },
//     formattedAddress: { 
//       type: DataTypes.TEXT, 
//       allowNull: true,
//     },

//     // Virtual field for Google Maps link
//     googleMapsLink: {
//       type: DataTypes.VIRTUAL,
//       get() {
//         if (this.latitude && this.longitude) {
//           return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
//         }
//         if (this.formattedAddress) {
//           return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.formattedAddress)}`;
//         }
//         return null;
//       }
//     },

//     // Directions link for delivery partners
//     directionsLink: {
//       type: DataTypes.VIRTUAL,
//       get() {
//         if (this.latitude && this.longitude) {
//           return `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}`;
//         }
//         return null;
//       }
//     },

//     // Added Shipping Type field
//     shippingType: {
//       type: DataTypes.ENUM("delivery", "pickup"),
//       allowNull: false,
//       defaultValue: "delivery",
//     },
//   },
//   {
//     sequelize,
//     modelName: "OrderAddress",
//     tableName: "order_addresses",
//   }
// );








// module.exports = OrderAddress;
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class OrderAddress extends Model {}

OrderAddress.init(
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

    /* ---------------- CUSTOMER DETAILS ---------------- */

    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    /* ---------------- ADDRESS STRUCTURE ---------------- */

    addressLine: {
      type: DataTypes.TEXT,
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

    selectedAddressLine: {
      type: DataTypes.TEXT,
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

    /* ---------------- SHIPPING ---------------- */

    shippingType: {
      type: DataTypes.ENUM("delivery", "pickup"),
      allowNull: false,
      defaultValue: "delivery",
    },

    /* ---------------- VIRTUAL FIELDS ---------------- */

    googleMapsLink: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.latitude && this.longitude) {
          return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
        }
        if (this.formattedAddress) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            this.formattedAddress
          )}`;
        }
        return null;
      },
    },

    directionsLink: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.latitude && this.longitude) {
          return `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}`;
        }
        return null;
      },
    },
  },
  {
    sequelize,
    modelName: "OrderAddress",
    tableName: "order_addresses",
    timestamps: true,
  }
);

module.exports = OrderAddress;