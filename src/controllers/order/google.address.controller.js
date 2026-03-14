const UserAddress = require("../../models/orders/userAddress.model");

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

    // Prepare address data with location fields
    const addressData = {
      ...data,
      userId,
      // Ensure location fields are properly set
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      placeId: data.placeId || null,
      formattedAddress: data.formattedAddress || null
    };

    const address = await UserAddress.create(addressData);

    // Generate Google Maps link for response
    const googleMapsLink = address.latitude && address.longitude 
      ? `https://www.google.com/maps?q=${address.latitude},${address.longitude}`
      : null;

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: {
        ...address.toJSON(),
        googleMapsLink
      },
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

    // Update with location data
    await address.update({
      ...data,
      latitude: data.latitude || address.latitude,
      longitude: data.longitude || address.longitude,
      placeId: data.placeId || address.placeId,
      formattedAddress: data.formattedAddress || address.formattedAddress
    });

    // Generate Google Maps link for response
    const googleMapsLink = address.latitude && address.longitude 
      ? `https://www.google.com/maps?q=${address.latitude},${address.longitude}`
      : null;

    res.json({
      success: true,
      message: "Address updated successfully",
      data: {
        ...address.toJSON(),
        googleMapsLink
      },
    });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

// Add a utility function to get Google Maps link for an address
exports.getAddressWithGoogleLink = async (req, res) => {
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

    // Generate Google Maps link
    const googleMapsLink = address.latitude && address.longitude 
      ? `https://www.google.com/maps?q=${address.latitude},${address.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.addressLine + ', ' + address.city + ', ' + address.state + ', ' + address.zipCode)}`;

    res.json({
      success: true,
      data: {
        ...address.toJSON(),
        googleMapsLink
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};