// const fs = require("fs");
// const path = require("path");
// const PDFDocument = require("pdfkit");

// exports.generateInvoice = async ({ order, items, address }) => {
//   const dir = path.join(__dirname, "../../invoices");
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir);

//   const filePath = path.join(dir, `invoice-${order.orderNumber}.pdf`);

//   const doc = new PDFDocument();
//   doc.pipe(fs.createWriteStream(filePath));

//   doc.fontSize(20).text("INVOICE", { align: "center" });
//   doc.moveDown();

//   doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
//   doc.text(`Customer: ${address.fullName}`);
//   doc.text(`Email: ${address.email}`);
//   doc.text(`Address: ${address.addressLine}, ${address.city}`);
//   doc.moveDown();

//   items.forEach((item) => {
//     doc.text(`${item.productName} (${item.sizeLabel}) x${item.quantity} - ₹${item.totalPrice}`);
//   });

//   doc.moveDown();
//   doc.text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });

//   doc.end();

//   return filePath;
// };
