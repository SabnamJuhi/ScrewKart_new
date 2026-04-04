const { DataTypes } = require("sequelize")
const sequelize = require("../config/db")

const Admin = sequelize.define("Admin", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM("superAdmin", "storeAdmin"),
    defaultValue: "storeAdmin"
  },
  storeId: {
    type: DataTypes.INTEGER,
    allowNull: true // required only for storeAdmin
  }
})

module.exports = Admin
