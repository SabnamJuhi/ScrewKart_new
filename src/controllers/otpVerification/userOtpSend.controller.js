const { User } = require("../../models");
const { sendOTP } = require("../../utils/sms");

// exports.sendOtp = async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;

//     if (!mobileNumber) {
//       return res.status(400).json({ message: "Mobile number required" });
//     }

//     let user = await User.findOne({ where: { mobileNumber } });

// // console.log("MSG91 RESPONSE:", response.data);

//     // 👉 CREATE USER IF NOT EXISTS (optional)
//     if (!user) {
//       user = await User.create({ mobileNumber });
//     }

//     // ✅ 🔥 ADD VALIDATION HERE (IMPORTANT)
//     if (user.otpExpiresAt && new Date() < user.otpExpiresAt) {
//       return res.status(429).json({
//         message: "Wait before requesting another OTP"
//       });
//     }

//     // 👉 GENERATE OTP AFTER CHECK
//     const otp = Math.floor(100000 + Math.random() * 900000);

//     user.otp = otp;
//     user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

//     await user.save();

//     await sendOTP(mobileNumber, otp);

//     res.json({
//       success: true,
//       message: "OTP sent successfully"
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


exports.sendOtp = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number required" });
    }

    let user = await User.findOne({ where: { mobileNumber } });

    if (!user) {
      user = await User.create({ mobileNumber });
    }

    // ⏱ Rate limit (optional)
    if (user.otpExpiresAt && new Date() < user.otpExpiresAt) {
      return res.status(429).json({
        message: "Wait before requesting another OTP"
      });
    }

    // 👉 Just call MSG91
    await sendOTP(mobileNumber);

    // optional: store cooldown only
    user.otpExpiresAt = new Date(Date.now() + 60 * 1000); // 1 min cooldown
    await user.save();

    res.json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};