// controllers/orders/userBillingAddress.controller.js

const UserBillingAddress = require("../../models/orders/userBillingAddress.model");




// ================= CREATE =================

exports.createBillingAddress = async (req, res) => {
  try {

    const userId = req.user.id;

    const billing = await UserBillingAddress.create({
      userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      billing,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};


// ================= GET ALL =================

exports.getBillingAddresses = async (req, res) => {
  try {

    const userId = req.user.id;

    const addresses = await UserBillingAddress.findAll({
      where: { userId },
      order: [["id", "DESC"]],
    });

    res.json({
      success: true,
      addresses,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};


// ================= UPDATE =================

exports.updateBillingAddress = async (req, res) => {
  try {

    const userId = req.user.id;

    const address = await UserBillingAddress.findOne({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Billing address not found",
      });
    }

    await address.update(req.body);

    res.json({
      success: true,
      address,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};


// ================= DELETE =================

exports.deleteBillingAddress = async (req, res) => {
  try {

    const userId = req.user.id;

    const address = await UserBillingAddress.findOne({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Billing address not found",
      });
    }

    await address.destroy();

    res.json({
      success: true,
      message: "Billing address deleted",
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};