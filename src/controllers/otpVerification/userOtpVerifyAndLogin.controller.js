exports.verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    const user = await User.findOne({ where: { mobileNumber } });

    if (!user || !user.otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // clear OTP after success
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // 🔥 SAME TOKEN SYSTEM (no change)
    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        userName: user.userName
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};