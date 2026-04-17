const Notification = require("../../models/notificationStatus/notificationStatus.model");
const { Op } = require("sequelize");


exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        userId: userId,
        isDeleted: false,
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

exports.getDeliveryNotifications = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy.id;;

    const notifications = await Notification.findAll({
      where: {
        deliveryBoyId: deliveryBoyId,
        isDeleted: false,
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

exports.getAdminNotifications = async (req, res) => {
  try {
    const { role, storeId } = req.user;

    let condition = {
      isDeleted: false,
    };

    if (role === "superAdmin") {
      // 🔥 all notifications
      condition = { isDeleted: false };
    } 
    else if (role === "storeAdmin") {
      // 🔥 only their store
      condition = {
        isDeleted: false,
        storeId: storeId,
      };
    } 
    else {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const notifications = await Notification.findAll({
      where: condition,
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
