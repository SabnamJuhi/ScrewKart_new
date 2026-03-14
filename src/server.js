require("dotenv").config()
const app = require("./app")
const sequelize = require("./config/db")

sequelize.sync().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Admin server running on port ${process.env.PORT}`)
  })
})

