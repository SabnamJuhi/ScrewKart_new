const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class UnitMaster extends Model {}

UnitMaster.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    name: {
      type: DataTypes.STRING, // mm, kg, liter, pcs
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "unit_master",
  }
);

module.exports = UnitMaster;