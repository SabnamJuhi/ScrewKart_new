const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

// class User extends Model {}

// User.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true
//     },

//     userName: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },

//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true
//     },

//     mobileNumber: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },

//     password: {
//       type: DataTypes.STRING,
//       allowNull: true // null for Google users
//     },

//     googleId: {
//       type: DataTypes.STRING,
//       allowNull: true
//     }
//   },
//   {
//     sequelize,
//     modelName: "User"
//   }
// );

// module.exports = User;

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userName: {
      type: DataTypes.STRING,
      allowNull: true, // ⚠️ make optional (OTP users may not have it initially)
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        len: [10, 10],
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true, // null for OTP / Google users
    },

    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // 🔥 NEW FIELDS FOR OTP
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    timestamps: true,
  },
);

module.exports = User;
