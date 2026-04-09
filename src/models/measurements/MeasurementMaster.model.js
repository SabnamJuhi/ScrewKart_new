const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class MeasurementMaster extends Model {}

MeasurementMaster.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    name: {
      type: DataTypes.STRING, // Length, Diameter, Thread Pitch
      allowNull: false,
    },

    unit: {
      type: DataTypes.STRING, // mm, kg, ml
      allowNull: false,
    },

    isFilterable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "measurement_master",
  }
);

module.exports = MeasurementMaster;