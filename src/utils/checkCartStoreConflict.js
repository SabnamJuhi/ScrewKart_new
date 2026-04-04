const { CartItem } = require("../models");

module.exports = async (userId, newStoreId) => {
  const existingItem = await CartItem.findOne({ where: { userId } });

  if (!existingItem) return { allowed: true };

  if (existingItem.storeId !== newStoreId) {
    return {
      allowed: false,
      message:
        "Your cart contains items from another store. Please clear cart to continue.",
    };
  }

  return { allowed: true };
};