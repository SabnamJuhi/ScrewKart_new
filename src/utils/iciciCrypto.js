


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
