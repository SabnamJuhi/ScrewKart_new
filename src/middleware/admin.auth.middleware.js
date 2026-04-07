// const jwt = require("jsonwebtoken")
// const { secret } = require("../config/jwt")

// module.exports = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]

//   if (!token)
//     return res.status(401).json({ message: "Admin token required" })

//   try {
//     const decoded = jwt.verify(token, secret)
//     req.admin = decoded
//     next()
//   } catch {
//     res.status(401).json({ message: "Invalid or expired token" })
//   }
// }




// middleware/admin.auth.middleware.js
const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.error("No token provided in request headers");
    return res.status(401).json({ 
      success: false,
      message: "Admin token required" 
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    
    console.log("Token decoded successfully:", {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId
    });
    
    // Ensure the decoded token has required fields
    if (!decoded.id || !decoded.email) {
      console.error("Token missing required fields");
      return res.status(401).json({ 
        success: false,
        message: "Invalid token payload: missing required fields" 
      });
    }
    
    req.admin = decoded;
    
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};