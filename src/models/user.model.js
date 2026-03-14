const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

// const User = sequelize.define("User", {
//   userName: { type: DataTypes.STRING, allowNull: false },
//   email: { type: DataTypes.STRING, allowNull: false, unique: true },
//   googleId: { type: DataTypes.STRING, unique: true },
//   mobileNumber: { type: DataTypes.STRING, allowNull: true },
//   password: { type: DataTypes.STRING, allowNull: true } 
// });

// module.exports = User;



class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    userName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true // null for Google users
    },

    googleId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: "User"
  }
);

module.exports = User;