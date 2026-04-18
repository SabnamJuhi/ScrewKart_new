


const {
  sendContactToCompany,
  sendAutoReplyToCustomer,
} = require("../../utils/email");

exports.sendContactEnquiry = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required",
      });
    }

    const attachments =
      req.files?.map((file) => ({
        filename: file.originalname,
        path: file.path,
      })) || [];

    // send mail to company
    await sendContactToCompany({
      name,
      email,
      phone,
      message,
      attachments,
    });

    // auto reply
    await sendAutoReplyToCustomer({ name, email });

    return res.json({
      success: true,
      message: "Enquiry sent successfully",
    });
  } catch (error) {
    console.error("Contact Enquiry Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send enquiry",
    });
  }
};