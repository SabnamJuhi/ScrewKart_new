// const { User } = require("../../models");
// const { sendOTP } = require("../../utils/sms");



// exports.sendOtp = async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;

//     if (!mobileNumber) {
//       return res.status(400).json({ message: "Mobile number required" });
//     }

//     let user = await User.findOne({ where: { mobileNumber } });

//     if (!user) {
//       user = await User.create({ mobileNumber });
//     }

//     // ⏱ Rate limit (optional)
//     if (user.otpExpiresAt && new Date() < user.otpExpiresAt) {
//       return res.status(429).json({
//         message: "Wait before requesting another OTP"
//       });
//     }

//     // 👉 Just call MSG91
//     await sendOTP(mobileNumber);

//     // optional: store cooldown only
//     user.otpExpiresAt = new Date(Date.now() + 60 * 1000); // 1 min cooldown
//     await user.save();

//     res.json({
//       success: true,
//       message: "OTP sent successfully"
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };





const { User } = require("../../models");
const { sendOTP } = require("../../utils/sms");

exports.sendOtp = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number required",
      });
    }

    // ✅ Check existing user
    const user = await User.findOne({
      where: { mobileNumber },
    });

    // ❌ User not found
    if (!user) {
      return res.status(404).json({
        success: false,
        isRegistered: false,
        message: "Mobile number not registered. Please register first.",
      });
    }

    // ⏱ OTP cooldown
    if (user.otpExpiresAt && new Date() < user.otpExpiresAt) {
      return res.status(429).json({
        success: false,
        message: "Wait before requesting another OTP",
      });
    }

    // ✅ Send OTP
    await sendOTP(mobileNumber);

    // Save cooldown
    user.otpExpiresAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    return res.json({
      success: true,
      isRegistered: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};