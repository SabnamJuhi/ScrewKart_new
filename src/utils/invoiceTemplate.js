
// const { toWords } = require("number-to-words");

// const generateInvoiceHTML = ({ order, orderItems, address }) => {
//   const formatDate = (date) => new Date(date).toLocaleDateString("en-IN");

//   const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);

//   return `
//   <html>
//   <head>
//     <style>
//       body { font-family: Arial; font-size: 12px; }
//       table { width: 100%; border-collapse: collapse; }
//       th, td { border: 1px solid black; padding: 6px; }
//       .no-border td { border: none; }
//       .center { text-align: center; }
//       .right { text-align: right; }
//       .bold { font-weight: bold; }
//     </style>
//   </head>

//   <body>

//   <h3 class="center">GST INVOICE</h3>

//   <table>
//     <tr>
//       <td width="60%">
//         <b>A M ENTERPRISES</b><br/>
//         GSTIN: XXXXXXXX<br/>
//         State: Telangana
//       </td>
//       <td>
//         Invoice No: ${order.orderNumber}<br/>
//         Date: ${formatDate(order.createdAt)}
//       </td>
//     </tr>

//     <tr>
//       <td>
//         <b>Buyer (Bill To)</b><br/>
//         ${address.fullName}<br/>
//         ${address.addressLine}<br/>
//         ${address.city}, ${address.state}
//       </td>
//       <td>
//         Payment: ${order.paymentMethod}
//       </td>
//     </tr>
//   </table>

//   <br/>

//   <table>
//     <tr class="bold center">
//       <td>Sl No</td>
//       <td>Description</td>
//       <td>HSN</td>
//       <td>Qty</td>
//       <td>Rate</td>
//       <td>Amount</td>
//     </tr>

//     ${orderItems.map((item, i) => `
//       <tr>
//         <td>${i + 1}</td>
//         <td>${item.productName}</td>
//         <td>73181500</td>
//         <td>${item.quantity}</td>
//         <td>${item.basePrice}</td>
//         <td>${item.subTotal}</td>
//       </tr>
//     `).join("")}

//     <tr>
//       <td colspan="3" class="right bold">Total</td>
//       <td>${totalQty}</td>
//       <td></td>
//       <td>${order.subtotal}</td>
//     </tr>
//   </table>

//   <br/>

//   <table>
//     <tr>
//       <td class="right">CGST (9%)</td>
//       <td class="right">${order.taxAmount / 2}</td>
//     </tr>
//     <tr>
//       <td class="right">SGST (9%)</td>
//       <td class="right">${order.taxAmount / 2}</td>
//     </tr>
//     <tr>
//       <td class="right">Shipping</td>
//       <td class="right">${order.shippingFee}</td>
//     </tr>
//     <tr>
//       <td class="right bold">Grand Total</td>
//       <td class="right bold">${order.totalAmount}</td>
//     </tr>
//   </table>

//   <br/>

//   <table>
//     <tr>
//       <td>
//         Amount in words:<br/>
//         <b>${toWords(order.totalAmount)} Only</b>
//       </td>
//     </tr>
//   </table>

//   <br/>

//   <table>
//     <tr>
//       <td width="60%">
//         <b>Bank Details</b><br/>
//         A M ENTERPRISES<br/>
//         HDFC BANK<br/>
//         A/C: XXXXXXXX
//       </td>
//       <td class="center">
//         For A M ENTERPRISES<br/><br/><br/>
//         Authorised Signatory
//       </td>
//     </tr>
//   </table>

//   </body>
//   </html>
//   `;
// };

// module.exports = generateInvoiceHTML;






const { toWords } = require("number-to-words");

const generateInvoiceHTML = ({ order, orderItems, address }) => {
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY format
  };

  const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
  
  // Calculate GST breakdown (assuming 18% total GST - 9% CGST + 9% SGST)
  const cgstAmount = (order.taxAmount / 2).toFixed(2);
  const sgstAmount = (order.taxAmount / 2).toFixed(2);
  
  // Get first item's HSN (you can make this dynamic based on product)
  const hsnCode = "73181500"; // Default HSN for screws/fasteners

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>GST Invoice - ${order.orderNumber}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #000;
        padding: 20px;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        border: 1px solid #ddd;
        padding: 20px;
      }
      
      .header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
      }
      
      .header h1 {
        font-size: 20px;
        margin-bottom: 5px;
      }
      
      .company-details {
        text-align: center;
        font-size: 10px;
        margin-bottom: 15px;
      }
      
      .company-details p {
        margin: 2px 0;
      }
      
      .invoice-title {
        text-align: center;
        font-size: 18px;
        font-weight: bold;
        margin: 15px 0;
        text-decoration: underline;
      }
      
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
      }
      
      .info-table td {
        padding: 5px;
        vertical-align: top;
      }
      
      .info-table .label {
        font-weight: bold;
        width: 120px;
      }
      
      .buyer-section {
        margin-bottom: 20px;
        border: 1px solid #000;
        padding: 10px;
      }
      
      .buyer-title {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 12px;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      .items-table th,
      .items-table td {
        border: 1px solid #000;
        padding: 6px;
        text-align: left;
      }
      
      .items-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        text-align: center;
      }
      
      .items-table td {
        text-align: right;
      }
      
      .items-table td:first-child,
      .items-table td:nth-child(2),
      .items-table td:nth-child(3) {
        text-align: left;
      }
      
      .items-table td:nth-child(4),
      .items-table td:nth-child(5),
      .items-table td:nth-child(6) {
        text-align: right;
      }
      
      .totals-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      .totals-table td {
        padding: 5px;
      }
      
      .totals-table .right-align {
        text-align: right;
      }
      
      .totals-table .bold {
        font-weight: bold;
      }
      
      .gst-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      .gst-table th,
      .gst-table td {
        border: 1px solid #000;
        padding: 6px;
        text-align: center;
      }
      
      .gst-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      
      .amount-words {
        margin: 15px 0;
        padding: 10px;
        border: 1px solid #ddd;
        background-color: #f9f9f9;
      }
      
      .bank-details {
        margin: 15px 0;
        padding: 10px;
        border: 1px solid #000;
      }
      
      .bank-details h4 {
        margin-bottom: 8px;
        font-size: 12px;
      }
      
      .signature {
        margin-top: 30px;
        text-align: right;
        padding-top: 20px;
      }
      
      .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 9px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }
      
      .text-center {
        text-align: center;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-left {
        text-align: left;
      }
      
      .bold {
        font-weight: bold;
      }
      
      hr {
        margin: 10px 0;
      }
    </style>
  </head>
  
  <body>
    <div class="invoice-container">
      <!-- Header -->
      <div class="header">
        <h1>GST INVOICE</h1>
      </div>
      
      <!-- Company Details -->
      <div class="company-details">
        <p><strong>A M ENTERPRISES</strong></p>
        <p>Ground Floor, Plot No:30, Ganesh Housing Colony, Beside Srujana Hospitals Lane,</p>
        <p>Quthubullapur, Jeeedimettai, Hyderabad - 500055</p>
        <p>GSTIN/UNI: 36AAAMTA-A32841Z1 | State Name: Telangana, Code: 36</p>
        <p>Contact: 9985748706, 7989327726 | E-Mail: a.m.enterprises103@gmail.com</p>
      </div>
      
      <!-- Invoice Info Table -->
      <table class="info-table">
        <tr>
          <td class="label">Invoice No:</td>
          <td>${order.orderNumber}</td>
          <td class="label">Date:</td>
          <td>${formatDate(order.createdAt)}</td>
        </tr>
        <tr>
          <td class="label">Delivery Note:</td>
          <td>-</td>
          <td class="label">Mode/Terms of Payment:</td>
          <td>${order.paymentMethod}</td>
        </tr>
        <tr>
          <td class="label">Supplier's Ref:</td>
          <td>-</td>
          <td class="label">Other Reference(s):</td>
          <td>-</td>
        </tr>
        <tr>
          <td class="label">Buyer's Order No:</td>
          <td>-</td>
          <td class="label">Dated:</td>
          <td>-</td>
        </tr>
        <tr>
          <td class="label">Dispatch Document No:</td>
          <td>-</td>
          <td class="label">Delivery Note Date:</td>
          <td>-</td>
        </tr>
        <tr>
          <td class="label">Despatch through:</td>
          <td>-</td>
          <td class="label">Terms of Delivery:</td>
          <td>Standard Delivery</td>
        </tr>
      </table>
      
      <!-- Buyer Details -->
      <div class="buyer-section">
        <div class="buyer-title">Buyer (Bill to)</div>
        <p><strong>${address.fullName}</strong></p>
        <p>${address.addressLine}</p>
        <p>${address.city}, ${address.state} - ${address.zipCode}</p>
        <p>Phone: ${address.phoneNumber} | Email: ${address.email}</p>
        <p>GSTIN/UNI: ${address.gstin || 'Not Available'}</p>
        <p>State Name: ${address.state}, Code: ${address.stateCode || '36'}</p>
      </div>
      
      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:5%">Sl No</th>
            <th style="width:40%">Description of Goods</th>
            <th style="width:12%">HSN/SAC</th>
            <th style="width:8%">Quantity</th>
            <th style="width:10%">Rate (₹)</th>
            <th style="width:10%">per</th>
            <th style="width:15%">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${orderItems.map((item, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td>${item.productName}</td>
              <td class="text-center">${hsnCode}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${item.basePrice.toFixed(2)}</td>
              <td class="text-center">PCS</td>
              <td class="text-right">${item.subTotal.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="bold text-right">Total</td>
            <td class="text-center bold">${totalQty}</td>
            <td colspan="2"></td>
            <td class="text-right bold">${order.subtotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <!-- GST and Totals -->
      <table class="gst-table">
        <thead>
          <tr>
            <th>HSN/SAC</th>
            <th>Taxable Value (₹)</th>
            <th>CGST</th>
            <th>SGST/UTGST</th>
            <th>Total Tax Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${hsnCode}</td>
            <td>${order.subtotal.toFixed(2)}</td>
            <td>9%<br/>${cgstAmount}</td>
            <td>9%<br/>${sgstAmount}</td>
            <td>${order.taxAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Amount in Words -->
      <div class="amount-words">
        <strong>Amount Chargeable (in words):</strong><br/>
        INR ${toWords(Math.floor(order.totalAmount))} ${order.totalAmount % 1 !== 0 ? `and ${Math.round((order.totalAmount % 1) * 100)} paise` : ''} Only
      </div>
      
      <!-- Tax Amount in Words -->
      <div class="amount-words" style="margin-top: 5px;">
        <strong>Tax Amount (in words):</strong><br/>
        INR ${toWords(Math.floor(order.taxAmount))} ${order.taxAmount % 1 !== 0 ? `and ${Math.round((order.taxAmount % 1) * 100)} paise` : ''} Only
      </div>
      
      <!-- Company Declaration -->
      <div style="margin: 15px 0;">
        <p><strong>Declaration:</strong></p>
        <p style="font-size: 9px;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
      </div>
      
      <!-- Bank Details -->
      <div class="bank-details">
        <h4>Company's Bank Details</h4>
        <p><strong>A/c Holder's Name:</strong> AM ENTERPRISES</p>
        <p><strong>Bank Name:</strong> HDFC BANK</p>
        <p><strong>Account No.:</strong> 50200097000967</p>
        <p><strong>Branch & IFS Code:</strong> Pet Basheerabad Branch & HDFC0000696</p>
      </div>
      
      <!-- Signature -->
      <div class="signature">
        <p>For A M ENTERPRISES</p>
        <br/><br/>
        <p><strong>Authorised Signatory</strong></p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>This is a computer generated invoice and does not require physical signature</p>
        <p>Thank you for your business!</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = generateInvoiceHTML;