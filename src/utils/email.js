const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendResetPasswordEmail = async (email, resetLink) => {
  await transporter.sendMail({
    from: `"SajDhaj Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>Click below link to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};

/* ================= DELIVERY ASSIGNMENT EMAIL ================= */
exports.sendDeliveryAssignmentEmail = async ({
  to,
  orderNumber,
  customerName,
  phone,
  address,
  verificationLink,
   codPaymentLink = null,   
  isCOD = false, 
}) => {
  await transporter.sendMail({
    from: `"Admin" <${process.env.EMAIL_USER}>`,
    to,
    subject: "New Delivery Assigned",
    html: `
      <h2>New Order Assigned</h2>

      <p><b>Order Number:</b> ${orderNumber}</p>
      <p><b>Customer Name:</b> ${customerName}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Address:</b> ${address}</p>

      <br/>

      <a href="${verificationLink}"
         style="padding:10px 18px;background:#28a745;color:#fff;
                text-decoration:none;border-radius:6px;">
        Verify Delivery OTP
      </a>

      <p style="margin-top:15px;">
        Open this link after delivering the parcel to verify OTP.
      </p>
      ${
        isCOD && codPaymentLink
          ? `
              <p><b>After collecting cash from customer:</b></p>
              <a href="${codPaymentLink}"
                style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;
                text-decoration:none;border-radius:6px;font-weight:bold;margin-top:10px;">
                Confirm COD Payment
              </a>
            `
          : ""
      }

    `,
  });
};


// // send mail to company
// exports.sendContactToCompany = async ({ name, email, phone, message }) => {
//   return transporter.sendMail({
//     from: `"Website Contact" <${process.env.EMAIL_USER}>`,
//     to: process.env.EMAIL_USER, // company email
//     subject: "New Contact Enquiry",
//     html: `
//       <h2>New Enquiry Received</h2>
//       <p><b>Name:</b> ${name}</p>
//       <p><b>Email:</b> ${email}</p>
//       <p><b>Phone:</b> ${phone}</p>
//       <p><b>Message:</b><br/> ${message}</p>
//     `,
//   });
// };

exports.sendContactToCompany = async ({
  name,
  email,
  phone,
  message,
  attachments = [],
}) => {
  return transporter.sendMail({
    from: `"Website Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "New Contact Enquiry",
    html: `
      <h2>New Enquiry Received</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Message:</b><br/> ${message}</p>
    `,
    attachments,
  });
};

// auto reply to customer
exports.sendAutoReplyToCustomer = async ({ name, email }) => {
  return transporter.sendMail({
    from: `"ScrewKart Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "We received your enquiry",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for contacting ScrewKart.  
      Our team will get back to you shortly.</p>

      <p>Regards,<br/>ScrewKart Team</p>
    `,
  });
};


/**
 * Send order email to company and customer
 */
exports.sendInvoiceEmail = async ({ orderNumber, orderAddress, totalAmount }) => {
  if (!orderAddress?.email) {
    throw new Error("Customer email missing");
  }

  const companyEmail = process.env.EMAIL_USER; // company receives mail

  // ---------- COMPANY EMAIL ----------
  await transporter.sendMail({
    from: `"ScrewKart Orders" <${process.env.EMAIL_USER}>`,
    to: companyEmail,
    subject: `🛒 New Order Received - ${orderNumber}`,
    html: `
      <h2>New Order Received</h2>
      <p><b>Order Number:</b> ${orderNumber}</p>
      <p><b>Customer Name:</b> ${orderAddress.fullName}</p>
      <p><b>Email:</b> ${orderAddress.email}</p>
      <p><b>Phone:</b> ${orderAddress.phoneNumber}</p>
      <p><b>Address:</b> ${orderAddress.addressLine}, ${orderAddress.city}, ${orderAddress.state}</p>
      <p><b>Total Amount:</b> ₹${totalAmount}</p>
    `,
  });

  // ---------- CUSTOMER EMAIL ----------
  await transporter.sendMail({
    from: `"ScrewKart" <${process.env.EMAIL_USER}>`,
    to: orderAddress.email, // ⚠️ THIS fixes "No recipients defined"
    subject: `✅ Order Confirmed - ${orderNumber}`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Hello ${orderAddress.fullName},</p>
      <p>Your order <b>${orderNumber}</b> has been placed successfully.</p>
      <p><b>Total Paid:</b> ₹${totalAmount}</p>
      <p>We will deliver it soon 🚚</p>
      <br/>
      <p>Regards,<br/>ScrewKart Team</p>
    `,
  });
};