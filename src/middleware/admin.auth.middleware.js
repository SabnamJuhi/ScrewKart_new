const jwt = require("jsonwebtoken")
const { secret } = require("../config/jwt")

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token)
    return res.status(401).json({ message: "Admin token required" })

  try {
    const decoded = jwt.verify(token, secret)
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ message: "Invalid or expired token" })
  }
}
