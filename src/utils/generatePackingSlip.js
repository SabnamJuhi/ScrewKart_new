
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

const generatePackingSlip = async ({
  order,
  orderItems,
  address,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const packingSlipDir = path.join(
        process.cwd(),
        "storage",
        "packing-slips"
      );

      if (!fs.existsSync(packingSlipDir)) {
        fs.mkdirSync(packingSlipDir, {
          recursive: true,
        });
      }

      const fileName = `packing-slip-${order.orderNumber}.pdf`;
      const filePath = path.join(packingSlipDir, fileName);

      const doc = new PDFDocument({
        size: "A4",
        margin: 30,
        layout: "portrait",
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors based on the image
      const navy = "#1a3a6b";
      const red = "#e74c3c";
      const border = "#d1d5db";
      const text = "#1f2937";
      const grayLight = "#f9fafb";

     // ========== HEADER SECTION ==========
      // Logo and Company Name
      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor(navy)
        .text("Screw", 40, 30, {
          continued: true,
        });

      doc
        .fillColor(red)
        .text("kart™");

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#6b7280")
        .text("Industrial Fasteners. Delivered Fast.", 40, 65);

      // PACKING SLIP Title
      // Positioned slightly lower to avoid overlapping with the logo line
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor(text)
        .text("PACKING SLIP", 350, 40, {
          width: 205,
          align: "right",
        });

      // Order ID and Date - Fixed Alignment logic
      const rightColumnX = 380; // Label start
      const colonX = 475;      // Colon and Value start
      
      // Order ID
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(text)
        .text("ORDER ID", rightColumnX, 80, { width: 90, align: "right" });
      
      doc
        .font("Helvetica")
        .fillColor("#4b5563")
        .text(`: ${order.orderNumber}`, colonX, 80);

      // Order Date
      doc
        .font("Helvetica-Bold")
        .fillColor(text)
        .text("ORDER DATE", rightColumnX, 98, { width: 90, align: "right" });
      
      doc
        .font("Helvetica")
        .fillColor("#4b5563")
        .text(`: ${moment(order.createdAt).format("DD MMM YYYY")}`, colonX, 98);

      // Divider Line
      doc
        .moveTo(40, 130)
        .lineTo(555, 130)
        .lineWidth(1)
        .strokeColor("#e5e7eb")
        .stroke();

// ========== ADDRESS SECTIONS ==========
      const billToY = 150;
      doc.roundedRect(40, billToY, 250, 150, 6).lineWidth(1).strokeColor(border).stroke();
      doc.roundedRect(40, billToY, 80, 25, 4).fill(navy);
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("Bill to", 48, billToY + 7);

      doc.fillColor(text).text("Customer Name:", 50, billToY + 40);
      doc.font("Helvetica").text(address.fullName || "-", 140, billToY + 40, { width: 140 });
      doc.font("Helvetica-Bold").text("Contact No.:", 50, billToY + 60);
      doc.font("Helvetica").text(address.phoneNumber || "-", 140, billToY + 60);
      doc.font("Helvetica-Bold").text("Address:", 50, billToY + 80);
      doc.font("Helvetica").text(`${address.addressLine || ""}, ${address.city || ""}, ${address.state || ""} - ${address.zipCode || ""}`, 140, billToY + 80, { width: 140, lineGap: 2 });

      doc.roundedRect(310, billToY, 250, 150, 6).strokeColor(border).stroke();
      doc.roundedRect(310, billToY, 120, 25, 4).fill(navy);
      doc.font("Helvetica-Bold").fillColor("#ffffff").text("Delivery Address", 318, billToY + 7);
      doc.fillColor("#4b5563").font("Helvetica").text(`${address.fullName}\n${address.addressLine}\n${address.city}, ${address.state} - ${address.zipCode}\nPh: ${address.phoneNumber}`, 320, billToY + 40, { width: 230, lineGap: 3 });

      // ========== TABLE SECTION ==========
      const tableTop = 320;
      doc.rect(40, tableTop, 520, 30).fill(navy);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
      doc.text("S.NO", 45, tableTop + 10, { width: 30, align: 'center' });
      doc.text("SKU", 85, tableTop + 10, { width: 100 });
      doc.text("PRODUCT NAME", 195, tableTop + 10, { width: 210 });
      doc.text("QTY", 415, tableTop + 10, { width: 40, align: 'center' });
      doc.text("LOCATION", 475, tableTop + 10, { width: 75, align: 'center' });

      let currentY = tableTop + 30;
      let totalQty = 0;

      orderItems.forEach((item, idx) => {
        totalQty += Number(item.quantity);
        const rowHeight = 45; // Increased slightly for comfort

        if (idx % 2 === 0) doc.rect(40, currentY, 520, rowHeight).fill(grayLight);
        doc.rect(40, currentY, 520, rowHeight).lineWidth(0.5).strokeColor(border).stroke();

        doc.font("Helvetica").fontSize(9).fillColor(text);

        // S.NO
        doc.text(idx + 1, 45, currentY + 15, { width: 30, align: 'center' });

        // SKU - FIXED WIDTH AND OVERFLOW
        const sku = item.productSnapshot?.sku || item.variantSnapshot?.variantCode || "-";
        doc.text(sku, 85, currentY + 12, { 
          width: 95, 
          height: 25, 
          ellipsis: true 
        });

        // PRODUCT NAME - FIXED WIDTH AND OVERFLOW
        doc.text(item.productName || "-", 195, currentY + 12, { 
          width: 210, 
          height: 25, 
          ellipsis: true 
        });

        // QTY
        doc.font("Helvetica-Bold").fontSize(12).fillColor(navy)
           .text(item.quantity, 415, currentY + 14, { width: 40, align: 'center' });

        // LOCATION
        const loc = `${item.variantSnapshot?.rackNo || "A"}-${item.variantSnapshot?.binNo || "0"}`;
        doc.font("Helvetica").fontSize(10).fillColor(text)
           .text(loc, 475, currentY + 15, { width: 75, align: 'center' });

        currentY += rowHeight;
      });


      // ========== TOTAL SECTION ==========
      const totalY = currentY + 15;
      
      doc
        .roundedRect(40, totalY, 520, 55, 6)
        .lineWidth(1)
        .strokeColor(border)
        .stroke();

      // Total Items
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(text)
        .text("Total Items", 60, totalY + 20);
      
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(navy)
        .text(String(orderItems.length), 160, totalY + 15);

      // Divider
      doc
        .moveTo(280, totalY)
        .lineTo(280, totalY + 55)
        .strokeColor(border)
        .stroke();

      // Total Quantity
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(text)
        .text("Total Quantity", 300, totalY + 20);
      
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(navy)
        .text(String(totalQty), 430, totalY + 15);

      // ========== NOTES & SIGNATURES SECTION ==========
      const notesY = totalY + 75;
      
      // Picked By
      doc
        .roundedRect(40, notesY, 150, 120, 6)
        .lineWidth(1)
        .strokeColor(border)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(text)
        .text("Picked By", 55, notesY + 15);

      doc
        .moveTo(55, notesY + 75)
        .lineTo(175, notesY + 75)
        .lineWidth(0.5)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#6b7280")
        .text("Date:", 55, notesY + 90);

      doc
        .moveTo(80, notesY + 96)
        .lineTo(175, notesY + 96)
        .lineWidth(0.5)
        .stroke();

      // Checked By
      doc
        .roundedRect(200, notesY, 150, 120, 6)
        .lineWidth(1)
        .strokeColor(border)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(text)
        .text("Checked By", 215, notesY + 15);

      doc
        .moveTo(215, notesY + 75)
        .lineTo(335, notesY + 75)
        .lineWidth(0.5)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#6b7280")
        .text("Date:", 215, notesY + 90);

      doc
        .moveTo(240, notesY + 96)
        .lineTo(335, notesY + 96)
        .lineWidth(0.5)
        .stroke();

      // Notes Section
      doc
        .roundedRect(360, notesY, 200, 120, 6)
        .lineWidth(1)
        .strokeColor(border)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(text)
        .text("Notes:", 375, notesY + 15);

      const notes = [
        "Read Product Name and Qty together",
        "Pick items strictly from locations",
        "Verify SKU and quantity before",
        "Report any mismatch immediately"
      ];

      let noteYPos = notesY + 40;
      notes.forEach(note => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6b7280")
          .text(`• ${note}`, 375, noteYPos);
        noteYPos += 18;
      });

      // ========== FOOTER ==========
      doc
        .moveTo(40, 760)
        .lineTo(560, 760)
        .lineWidth(1)
        .strokeColor(border)
        .stroke();

      doc
        .font("Helvetica-BoldOblique")
        .fontSize(12)
        .fillColor(navy)
        .text("From Shelf to Site in Minutes", 200, 770, {
          align: "center",
        });

      doc.end();

      stream.on("finish", () => {
        resolve(`/packing-slips/${fileName}`);
      });

      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generatePackingSlip;





