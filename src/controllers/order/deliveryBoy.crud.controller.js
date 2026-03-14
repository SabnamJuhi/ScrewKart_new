// const DeliveryBoy = require("../../models/orders/deliveryBoy.model");

// exports.createDeliveryBoy = async (req, res) => {
//   try {
//     const boy = await DeliveryBoy.create(req.body);
//     res.json({ success: true, data: boy });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };


// exports.getDeliveryBoys = async (req, res) => {
//   const boys = await DeliveryBoy.findAll({ order: [["createdAt", "DESC"]] });
//   res.json({ success: true, data: boys });
// };


// exports.updateDeliveryBoy = async (req, res) => {
//   const { id } = req.params;
//   const boy = await DeliveryBoy.findByPk(id);
//   if (!boy) throw new Error("Delivery boy not found");

//   await boy.update(req.body);
//   res.json({ success: true, data: boy });
// };


// exports.deleteDeliveryBoy = async (req, res) => {
//   const { id } = req.params;
//   await DeliveryBoy.destroy({ where: { id } });
//   res.json({ success: true, message: "Deleted successfully" });
// };
