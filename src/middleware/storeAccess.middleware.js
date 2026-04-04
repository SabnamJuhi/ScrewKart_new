exports.checkStoreAccess = (req, res, next) => {
  const admin = req.admin;

  // ✅ superAdmin → allow all
  if (admin.role === "superAdmin") return next();

  // ✅ storeAdmin → restrict
  if (admin.role === "storeAdmin") {
    const storeId =
      req.params.storeId ||
      req.params.id ||
      req.body.storeId ||
      req.query.storeId;

    if (!storeId) {
      return res.status(400).json({ message: "Store ID required" });
    }

    if (Number(storeId) !== admin.storeId) {
      return res.status(403).json({
        message: "You can only access your store"
      });
    }

    return next();
  }

  return res.status(403).json({ message: "Invalid role" });
};