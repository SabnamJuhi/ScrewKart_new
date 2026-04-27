


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

  // const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
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