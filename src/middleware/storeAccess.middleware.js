// exports.checkStoreAccess = (req, res, next) => {
//   const admin = req.admin;

//   // ✅ superAdmin → allow all
//   if (admin.role === "superAdmin") return next();

//   // ✅ storeAdmin → restrict
//   if (admin.role === "storeAdmin") {
//     const storeId =
//       req.params.storeId ||
//       req.params.id ||
//       req.body.storeId ||
//       req.query.storeId;

//     if (!storeId) {
//       return res.status(400).json({ message: "Store ID required" });
//     }

//     if (Number(storeId) !== admin.storeId) {
//       return res.status(403).json({
//         message: "You can only access your store"
//       });
//     }

//     return next();
//   }

//   return res.status(403).json({ message: "Invalid role" });
// };






// const { Order } = require("../models"); // adjust path

// exports.checkStoreAccess = async (req, res, next) => {
//   try {
//     const admin = req.admin;

//     // ✅ Super Admin → full access
//     if (admin.role === "superAdmin") return next();

//     // ✅ Store Admin → restricted
//     if (admin.role === "storeAdmin") {
//       let storeId;

//       // Case 1: Order-based APIs
//       if (req.params.orderNumber) {
//         const order = await Order.findOne({
//           where: { orderNumber: req.params.orderNumber },
//           attributes: ["storeId"]
//         });

//         if (!order) {
//           return res.status(404).json({
//             success: false,
//             message: "Order not found"
//           });
//         }

//         storeId = order.storeId;
//       }

//       // Case 2: Direct store APIs (fallback)
//       if (!storeId) {
//         storeId =
//           req.params.storeId ||
//           req.body.storeId ||
//           req.query.storeId;
//       }

//       if (!storeId) {
//         return res.status(400).json({
//           success: false,
//           message: "Store ID required"
//         });
//       }

//       if (Number(storeId) !== admin.storeId) {
//         return res.status(403).json({
//           success: false,
//           message: "You can only access your store"
//         });
//       }

//       return next();
//     }

//     return res.status(403).json({
//       success: false,
//       message: "Invalid role"
//     });

//   } catch (err) {
//     console.error("Store access middleware error:", err);
//     res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };





const { Order, Store } = require("../models");

exports.checkStoreAccess = async (req, res, next) => {
  try {
    const admin = req.admin;

    // ✅ Super Admin → full access
    if (admin.role === "superAdmin") {
      // still attach order if orderNumber exists
      if (req.params.orderNumber) {
        const order = await Order.findOne({
          where: { orderNumber: req.params.orderNumber },
          include: [{ model: Store, as: "store", attributes: ["id", "name"] }]
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found"
          });
        }

        req.order = order; // ✅ attach
      }

      return next();
    }

    // ✅ Store Admin → restricted
    if (admin.role === "storeAdmin") {
      if (req.params.orderNumber) {
        const order = await Order.findOne({
          where: { orderNumber: req.params.orderNumber },
          include: [{ model: Store, as: "store", attributes: ["id", "name"] }]
        });

        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found"
          });
        }

        // 🔥 attach order
        req.order = order;

        if (order.storeId !== admin.storeId) {
          return res.status(403).json({
            success: false,
            message: "You can only access your store orders"
          });
        }

        return next();
      }

      return res.status(400).json({
        success: false,
        message: "Order number required"
      });
    }

    return res.status(403).json({
      success: false,
      message: "Invalid role"
    });

  } catch (err) {
    console.error("Store access middleware error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};