const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { secret, expiresIn } = require("../config/jwt");

// Register Admin
exports.registerAdmin = async (req, res) => {
  const { fullName, email, password, confirmPassword, mobile, role, storeId } =
    req.body;

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
      role: admin.role,
      storeId: admin.storeId,
    },
  });
};
