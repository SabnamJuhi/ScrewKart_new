const Notification = require("../../models/notificationStatus/notificationStatus.model");

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
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