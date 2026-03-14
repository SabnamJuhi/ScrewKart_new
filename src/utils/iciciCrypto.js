// const crypto = require("crypto");

// exports.encrypt = (plainText, key) => {
//   const iv = Buffer.alloc(16, 0);
//   const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

//   let encrypted = cipher.update(plainText, "utf8", "base64");
//   encrypted += cipher.final("base64");

//   return encrypted;
// };

// exports.decrypt = (encryptedText, key) => {
//   const iv = Buffer.alloc(16, 0);
//   const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);

//   let decrypted = decipher.update(encryptedText, "base64", "utf8");
//   decrypted += decipher.final("utf8");

//   return decrypted;
// };





// const crypto = require("crypto");

// // AES Encryption
// exports.encrypt = (text, key) => {
//   const cipher = crypto.createCipheriv(
//     "aes-128-ecb",
//     Buffer.from(key, "utf8"),
//     null
//   );
//   let encrypted = cipher.update(text, "utf8", "base64");
//   encrypted += cipher.final("base64");
//   return encrypted;
// };

// // SHA256 Checksum
// exports.generateChecksum = (data, key) => {
//   return crypto
//     .createHmac("sha256", key)
//     .update(data)
//     .digest("hex");
// };




const crypto = require("crypto");

/**
 * AES-128-ECB Encryption (ICICI format)
 */
exports.encrypt = (text, key) => {
  const cipher = crypto.createCipheriv(
    "aes-128-ecb",
    Buffer.from(key, "utf8"),
    null
  );

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
};

/**
 * AES-128-ECB Decryption (needed for ICICI callback)
 */
exports.decrypt = (encryptedText, key) => {
  const decipher = crypto.createDecipheriv(
    "aes-128-ecb",
    Buffer.from(key, "utf8"),
    null
  );

  let decrypted = decipher.update(encryptedText, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

/**
 * SHA256 checksum generation
 */
exports.generateChecksum = (data, key) => {
  return crypto
    .createHmac("sha256", key)
    .update(data)
    .digest("hex");
};
