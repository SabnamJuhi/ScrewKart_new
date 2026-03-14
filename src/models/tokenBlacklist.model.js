// models/tokenBlacklist.model.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/db");

class TokenBlacklist extends Model {}

TokenBlacklist.init(
  {
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TokenBlacklist",
  }
);

module.exports = TokenBlacklist;
