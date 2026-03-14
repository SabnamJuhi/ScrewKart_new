const jwt = require("jsonwebtoken");
const DeliveryBoy = require("../models/orders/deliveryBoy.model");

exports.deliveryBoyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("Unauthorized");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const boy = await DeliveryBoy.findByPk(decoded.id);
    if (!boy) throw new Error("Delivery boy not found");

    req.deliveryBoy = boy;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
