require("dotenv").config();

const app = require("./app");
const sequelize = require("./config/db");

// ✅ Start cron jobs
require("./cron/slot.cron");

// ✅ Import slot initializer
const initSlots = require("./init/slot.init");

const startServer = async () => {
  try {
    // ✅ Connect DB
    await sequelize.sync();

    console.log("Database connected ✅");

    // ✅ Initialize slots (NO manual seeding needed anymore)
    await initSlots();

    // ✅ Start server
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT} 🚀`);
    });

  } catch (error) {
    console.error("Server startup error ❌:", error);
  }
};

startServer();