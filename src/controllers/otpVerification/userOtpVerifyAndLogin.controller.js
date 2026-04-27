const { User } = require("../../models");
const { generateToken } = require("../../utils/jwt");


// exports.verifyOtp = async (req, res) => {
//   try {
//     const { mobileNumber, otp } = req.body;

//     const user = await User.findOne({ where: { mobileNumber } });

//     if (!user || !user.otp) {
//       return res.status(400).json({ message: "Invalid request" });
//     }

//     if (user.otp !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     if (new Date() > user.otpExpiresAt) {
//       return res.status(400).json({ message: "OTP expired" });
//     }

//     // clear OTP after success
//     user.otp = null;
//     user.otpExpiresAt = null;
//     await user.save();

//     // 🔥 SAME TOKEN SYSTEM (no change)
//     const token = generateToken(user.id);

//     res.json({
//       success: true,
//       token,
//       user: {
//         id: user.id,
//         mobileNumber: user.mobileNumber,
//         userName: user.userName
//       }
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


exports.verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    const response = await fetch("https://api.msg91.com/api/v5/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        mobile: `91${mobileNumber}`,
        otp: otp,
      }),
    });

    const data = await response.json();

    if (data.type !== "success") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // ✅ Login user
    const user = await User.findOne({ where: { mobileNumber } });

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};