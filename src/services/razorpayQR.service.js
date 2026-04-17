const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class QRCodeService {
  constructor() {
    this.qrDir = path.join(process.cwd(), 'public', 'qrcodes');
    this.initDirectory();
  }

  async initDirectory() {
    try {
      await fs.mkdir(this.qrDir, { recursive: true });
    } catch (error) {
      console.error('Error creating QR directory:', error);
    }
  }

  /**
   * Generate QR code for COD payment
   * @param {Object} order - Order object
   * @param {Object} store - Store object with UPI details
   * @returns {Promise<string>} - Path to generated QR code
   */
  async generateCODQrCode(order, store) {
    try {
      // Create UPI payment link for COD order
      const upiPaymentData = this.createUPIPaymentData(order, store);
      
      // Generate QR code as buffer
      const qrBuffer = await QRCode.toBuffer(upiPaymentData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save QR code to file
      const fileName = `cod_qr_${order.orderNumber}_${Date.now()}.png`;
      const filePath = path.join(this.qrDir, fileName);
      
      await fs.writeFile(filePath, qrBuffer);
      
      // Return relative path for serving
      return `/qrcodes/${fileName}`;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Create UPI payment data string
   */
  createUPIPaymentData(order, store) {
    const upiId = store.upiId || process.env.STORE_UPI_ID;
    const merchantName = store.name || 'Store Name';
    const amount = order.totalAmount;
    const orderId = order.orderNumber;
    
    // UPI payment URL format
    // pay?pa=UPI_ID&pn=MerchantName&am=Amount&cu=INR&tn=OrderID
    const upiUrl = new URL('pay', 'upi://');
    upiUrl.searchParams.append('pa', upiId);
    upiUrl.searchParams.append('pn', merchantName);
    upiUrl.searchParams.append('am', amount.toString());
    upiUrl.searchParams.append('cu', 'INR');
    upiUrl.searchParams.append('tn', `Payment for order ${orderId}`);
    
    return upiUrl.toString();
  }

  /**
   * Generate QR code as base64 for API response
   */
  async generateCODQrCodeBase64(order, store) {
    const upiPaymentData = this.createUPIPaymentData(order, store);
    
    const qrBase64 = await QRCode.toDataURL(upiPaymentData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300
    });
    
    return qrBase64;
  }

  /**
   * Delete QR code file
   */
  async deleteQRCode(qrPath) {
    try {
      if (qrPath) {
        const fullPath = path.join(process.cwd(), 'public', qrPath);
        await fs.unlink(fullPath).catch(() => {});
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  }
}

module.exports = new QRCodeService();