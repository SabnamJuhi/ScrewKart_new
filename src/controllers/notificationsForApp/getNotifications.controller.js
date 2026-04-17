const Notification = require("../../models/notificationStatus/notificationStatus.model");
const { Op } = require("sequelize");

// exports.getNotifications = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const notifications = await Notification.findAll({
//       where: { userId },
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({
//       success: true,
//       data: notifications,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false });
//   }
// };

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { deliveryBoyId: userId },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.update(
      { isRead: true },
      { where: { id } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.update(
      { isDeleted: true },
      { where: { id } }
    );

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};