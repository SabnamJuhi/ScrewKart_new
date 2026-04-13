const UserAddress  = require("../../models/orders/userAddress.model");


exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      addressLine,
      customerDetails,
      type,
      address,
      isDefault,
    } = req.body;

    // ❗ VALIDATION (IMPORTANT)
    if (!customerDetails?.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // ✅ unset previous default
    if (isDefault) {
      await UserAddress.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    const newAddress = await UserAddress.create({
      userId,

      // 👤 Customer
      fullName: customerDetails?.name,
      phoneNumber: customerDetails?.phone,
      email: customerDetails?.email, // ✅ ADDED
      addressType: customerDetails?.addresstype,
      type,

      // 🏠 Address
      addressLine,
      house: address?.house,
      neighborhood: address?.neighborhood,
      landmark: address?.landmark,
      area: address?.area,
      locality: address?.locality,
      city: address?.city,
      state: address?.state,
      zipCode: address?.pincode,
      country: address?.country,

      // 📍 Location
      latitude: address?.gemetryData?.lat,
      longitude: address?.gemetryData?.lng,
      formattedAddress: address?.formatedAddress,
      selectedAddressLine: address?.selectedAddressLine,

      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: newAddress,
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

    const {
      addressLine,
      customerDetails,
      type,
      address,
      isDefault,
    } = req.body;

    const existing = await UserAddress.findOne({ where: { id, userId } });
    if (!existing) throw new Error("Address not found");

    // ✅ handle default
    if (isDefault) {
      await UserAddress.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    await existing.update({
      fullName: customerDetails?.name ?? existing.fullName,
      phoneNumber: customerDetails?.phone ?? existing.phoneNumber,
      email: customerDetails?.email ?? existing.email,
      addressType: customerDetails?.addresstype ?? existing.addressType,
      type: type ?? existing.type,

      addressLine: addressLine ?? existing.addressLine,
      house: address?.house ?? existing.house,
      neighborhood: address?.neighborhood ?? existing.neighborhood,
      landmark: address?.landmark ?? existing.landmark,
      area: address?.area ?? existing.area,
      locality: address?.locality ?? existing.locality,
      city: address?.city ?? existing.city,
      state: address?.state ?? existing.state,
      zipCode: address?.pincode ?? existing.zipCode,
      country: address?.country ?? existing.country,

      latitude: address?.gemetryData?.lat ?? existing.latitude,
      longitude: address?.gemetryData?.lng ?? existing.longitude,
      formattedAddress:
        address?.formatedAddress ?? existing.formattedAddress,
      selectedAddressLine:
        address?.selectedAddressLine ?? existing.selectedAddressLine,

      isDefault: isDefault ?? existing.isDefault,
    });

    res.json({
      success: true,
      message: "Address updated successfully",
      data: existing,
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