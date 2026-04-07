const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { secret, expiresIn } = require("../config/jwt");

// Register Admin
exports.registerAdmin = async (req, res) => {
  const { fullName, email, password, confirmPassword, mobile, role, storeId } = req.body;

  if (!fullName || !email || !password || !confirmPassword || !mobile) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  if (role === "storeAdmin" && !storeId) {
    return res.status(400).json({ message: "storeId required for storeAdmin" });
  }

  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Admin already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await Admin.create({
    fullName,
    email,
    mobile,
    password: hashedPassword,
    role,
    storeId: role === "storeAdmin" ? storeId : null,
  });

  res.status(201).json({ message: "Admin registered successfully" });
};

// Login Admin
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const admin = await Admin.findOne({ where: { email } });
  if (!admin) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    // { id: admin.id, email: admin.email },
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      storeId: admin.storeId,
    },
    secret,
    { expiresIn },
  );

  res.json({
    message: "Login successful",
    token,
     admin: {
    id: admin.id,
    fullName: admin.fullName,
    email: admin.email,
    role: admin.role,
    storeId: admin.storeId
  }
  });
};



// Get all Super Admins (Only accessible by Super Admin)
exports.getAllSuperAdmins = async (req, res) => {
  try {
    // Check if the requesting user is Super Admin
    if (req.admin.role !== "superAdmin") {
      return res.status(403).json({ 
        message: "Access denied. Only Super Admin can view this information" 
      });
    }

    const superAdmins = await Admin.findAll({
      where: { role: "superAdmin" },
      attributes: { exclude: ['password'] }, // Exclude password field
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: superAdmins.length,
      data: superAdmins,
    });
  } catch (error) {
    console.error("Error fetching super admins:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching super admins",
      error: error.message 
    });
  }
};

// Get all Store Admins (Only accessible by Super Admin)
exports.getAllStoreAdmins = async (req, res) => {
  try {
    // Check if the requesting user is Super Admin
    if (req.admin.role !== "superAdmin") {
      return res.status(403).json({ 
        message: "Access denied. Only Super Admin can view this information" 
      });
    }

    const storeAdmins = await Admin.findAll({
      where: { role: "storeAdmin" },
      attributes: { exclude: ['password'] }, // Exclude password field
      order: [['createdAt', 'DESC']],
      // Remove the include since association doesn't exist
      // If you need store details, you can add storeId and fetch separately
    });

    res.json({
      success: true,
      count: storeAdmins.length,
      data: storeAdmins,
    });
  } catch (error) {
    console.error("Error fetching store admins:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching store admins",
      error: error.message 
    });
  }
};

// Get admin by ID (Only accessible by Super Admin or the admin themselves)
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check authorization: Super Admin can access any, others can only access their own
    if (req.admin.role !== "superAdmin" && req.admin.id !== parseInt(id)) {
      return res.status(403).json({ 
        message: "Access denied. You can only view your own information" 
      });
    }

    const admin = await Admin.findByPk(id, {
      attributes: { exclude: ['password'] },
      // Remove the include
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching admin",
      error: error.message 
    });
  }
};


// Update admin (Only accessible by Super Admin or the admin themselves)
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fullName, 
      mobile, 
      password, 
      confirmPassword,
      newPassword,
      confirmNewPassword,
      storeId, 
      isActive,
      role 
    } = req.body;
    
    // Check authorization
    if (req.admin.role !== "superAdmin" && req.admin.id !== parseInt(id)) {
      return res.status(403).json({ 
        message: "Access denied. You can only update your own information" 
      });
    }

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Handle password update
    if (password || newPassword) {
      // Case 1: Admin updating their own password (requires current password)
      if (req.admin.id === parseInt(id)) {
        if (!password || !newPassword || !confirmNewPassword) {
          return res.status(400).json({ 
            message: "Current password, new password, and confirm new password are required to update password" 
          });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmNewPassword) {
          return res.status(400).json({ message: "New password and confirm password do not match" });
        }

        // Validate password strength (optional)
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Update password
        admin.password = await bcrypt.hash(newPassword, 10);
      }
      // Case 2: Super Admin updating store admin's password (doesn't require current password)
      else if (req.admin.role === "superAdmin" && admin.role === "storeAdmin") {
        if (!newPassword || !confirmNewPassword) {
          return res.status(400).json({ 
            message: "New password and confirm password are required to update store admin password" 
          });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmNewPassword) {
          return res.status(400).json({ message: "New password and confirm password do not match" });
        }

        // Validate password strength
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Update password
        admin.password = await bcrypt.hash(newPassword, 10);
      }
      else {
        return res.status(403).json({ 
          message: "You don't have permission to update this admin's password" 
        });
      }
    }

    // Update basic fields (allowed for both Super Admin and self)
    if (fullName) admin.fullName = fullName;
    if (mobile) admin.mobile = mobile;
    
    // Fields that only Super Admin can update
    if (req.admin.role === "superAdmin") {
      // Update storeId for store admin
      if (storeId !== undefined) {
        // Ensure that store admins have a storeId
        if (admin.role === "storeAdmin" && !storeId) {
          return res.status(400).json({ 
            message: "Store ID is required for store admin" 
          });
        }
        admin.storeId = storeId;
      }
      
      // Update isActive status
      if (isActive !== undefined) {
        // Prevent deactivating yourself
        if (req.admin.id === parseInt(id) && isActive === false) {
          return res.status(400).json({ 
            message: "You cannot deactivate your own account" 
          });
        }
        admin.isActive = isActive;
      }
      
      // Update role (with validation)
      if (role) {
        // Validate role
        if (!["superAdmin", "storeAdmin"].includes(role)) {
          return res.status(400).json({ 
            message: "Invalid role. Role must be either 'superAdmin' or 'storeAdmin'" 
          });
        }
        
        // Prevent changing your own role
        if (req.admin.id === parseInt(id)) {
          return res.status(400).json({ 
            message: "You cannot change your own role" 
          });
        }
        
        // If changing to storeAdmin, storeId is required
        if (role === "storeAdmin" && !storeId && !admin.storeId) {
          return res.status(400).json({ 
            message: "Store ID is required when changing role to storeAdmin" 
          });
        }
        
        admin.role = role;
        
        // Clear storeId if changing to superAdmin
        if (role === "superAdmin") {
          admin.storeId = null;
        }
      }
    }
    
    await admin.save();

    // Remove password from response
    const adminResponse = admin.toJSON();
    delete adminResponse.password;

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: adminResponse,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating admin",
      error: error.message 
    });
  }
};

// Delete admin (Only accessible by Super Admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the requesting user is Super Admin
    if (req.admin.role !== "superAdmin") {
      return res.status(403).json({ 
        message: "Access denied. Only Super Admin can delete admins" 
      });
    }

    // Prevent deleting yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ 
        message: "You cannot delete your own account" 
      });
    }

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await admin.destroy();

    res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting admin",
      error: error.message 
    });
  }
};


// Get current admin profile
exports.getMyProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: { exclude: ['password'] },
      // Remove the include
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching profile",
      error: error.message 
    });
  }
};
