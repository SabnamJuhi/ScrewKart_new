const UserAddress  = require("../../models/orders/userAddress.model");

exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // If setting default → unset previous default
    if (data.isDefault) {
      await UserAddress.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    const address = await UserAddress.create({ ...data, userId });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: address,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserAddresses = async (req, res) => {
  try {
    const addresses = await UserAddress.findAll({
      where: { userId: req.user.id },
      order: [
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.json({
      success: true,
      total: addresses.length,
      data: addresses,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const address = await UserAddress.findOne({ where: { id, userId } });
    if (!address) throw new Error("Address not found");

    if (data.isDefault) {
      await UserAddress.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    await address.update(data);

    res.json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await UserAddress.findOne({ where: { id, userId } });
    if (!address) throw new Error("Address not found");

    await address.destroy();

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await UserAddress.findOne({ where: { id, userId } });
    if (!address) throw new Error("Address not found");

    await UserAddress.update(
      { isDefault: false },
      { where: { userId } }
    );

    await address.update({ isDefault: true });

    res.json({
      success: true,
      message: "Default address updated",
      data: address,
    });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await UserAddress.findOne({
      where: { id, userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      data: address,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};