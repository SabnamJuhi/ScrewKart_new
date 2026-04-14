// // const fs = require("fs");
// // const path = require("path");
// // const PDFDocument = require("pdfkit");

// // exports.generateInvoice = async ({ order, items, address }) => {
// //   const dir = path.join(__dirname, "../../invoices");
// //   if (!fs.existsSync(dir)) fs.mkdirSync(dir);

// //   const filePath = path.join(dir, `invoice-${order.orderNumber}.pdf`);

// //   const doc = new PDFDocument();
// //   doc.pipe(fs.createWriteStream(filePath));

// //   doc.fontSize(20).text("INVOICE", { align: "center" });
// //   doc.moveDown();

// //   doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
// //   doc.text(`Customer: ${address.fullName}`);
// //   doc.text(`Email: ${address.email}`);
// //   doc.text(`Address: ${address.addressLine}, ${address.city}`);
// //   doc.moveDown();

// //   items.forEach((item) => {
// //     doc.text(`${item.productName} (${item.sizeLabel}) x${item.quantity} - ₹${item.totalPrice}`);
// //   });

// //   doc.moveDown();
// //   doc.text(`Total Amount: ₹${order.totalAmount}`, { align: "right" });

// //   doc.end();

// //   return filePath;
// // };






// const puppeteer = require("puppeteer");
// const fs = require("fs");
// const path = require("path");
// const generateInvoiceHTML = require("./invoiceTemplate");

// const generateInvoicePDF = async ({ order, orderItems, address }) => {
//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();

//   const html = generateInvoiceHTML({ order, orderItems, address });

//   await page.setContent(html, { waitUntil: "domcontentloaded" });

//   const filePath = path.join(__dirname, `../invoices/invoice-${order.orderNumber}.pdf`);

//   await page.pdf({
//     path: filePath,
//     format: "A4",
//   });

//   await browser.close();

//   return filePath;
// };

// module.exports = generateInvoicePDF;




const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const generateInvoiceHTML = require("./invoiceTemplate");

const generateInvoicePDF = async ({ order, orderItems, address }) => {

  // 🔥 go outside src → root → storage/invoices
  const invoicesDir = path.join(__dirname, "../../storage/invoices");

  // ✅ ensure folder exists
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const html = generateInvoiceHTML({ order, orderItems, address });

  await page.setContent(html);

  const filePath = path.join(
    invoicesDir,
    `invoice-${order.orderNumber}.pdf`
  );

  await page.pdf({
    path: filePath,
    format: "A4",
  });

  await browser.close();

  return filePath;
};

module.exports = generateInvoicePDF;