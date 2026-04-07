// exports.allowAdminRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.admin.role)) {
//       return res.status(403).json({
//         message: "Access denied"
//       });
//     }
//     next();
//   };
// };



// middleware/admin.role.middleware.js
exports.allowAdminRoles = (...roles) => {
  return (req, res, next) => {
    console.log("Role middleware - req.admin:", req.admin);
    console.log("Role middleware - req.admin exists?", !!req.admin);
    
    // Check if admin exists in request
    if (!req.admin) {
      console.error("Role middleware: Admin not found in request");
      return res.status(401).json({
        success: false,
        message: "Admin not authenticated"
      });
    }
    
    // Check if admin has role property
    if (!req.admin.role) {
      console.error("Role middleware: Admin role not found. Admin object:", req.admin);
      return res.status(401).json({
        success: false,
        message: "Invalid token: role missing"
      });
    }
    
    console.log(`Role middleware - Checking role: ${req.admin.role} against allowed: ${roles.join(", ")}`);
    
    // Check role permission
    if (!roles.includes(req.admin.role)) {
      console.log(`Role middleware - Access denied for role: ${req.admin.role}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.admin.role} role does not have permission`
      });
    }
    
    console.log("Role middleware - Access granted");
    next();
  };
};
