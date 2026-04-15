


// const {
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantSize,
//   VariantImage,
// } = require("../../../models");

// exports.buyNowCheckout = async (req, res) => {
//   try {
//     const { buyNow } = req.body;

//     if (!buyNow) {
//       return res.status(400).json({
//         success: false,
//         message: "Buy Now payload missing",
//       });
//     }

//     const { productId, variantId, sizeId, quantity } = buyNow;

//     if (!productId || !variantId || !sizeId || !quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     /* ================= PRODUCT ================= */
//     const product = await Product.findByPk(productId, {
//       include: [{ model: ProductPrice, as: "price" }],
//     });

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     /* ================= VARIANT ================= */
//     const variant = await ProductVariant.findOne({
//       where: {
//         id: variantId,
//         productId,
//         isActive: true,
//       },
//       include: [{ model: VariantImage, as: "images" }],
//     });

//     if (!variant) {
//       return res.status(404).json({
//         success: false,
//         message: "Variant not found for this product",
//       });
//     }

//     /* ================= SIZE ================= */
//     const variantSize = await VariantSize.findOne({
//       where: {
//         id: sizeId,
//         variantId,
//       },
//     });

//     if (!variantSize) {
//       return res.status(400).json({
//         success: false,
//         message: "Size does not belong to selected variant",
//       });
//     }

//     /* ================= VALIDATION ================= */
//     const price = Number(product.price?.sellingPrice || 0);
//     const stock = Number(variantSize.stock || 0);
//     const gstRate = Number(product.gstRate || 0);

//     if (!price || quantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid quantity or price",
//       });
//     }

//     if (stock < quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient stock",
//       });
//     }

//     /* ================= CALCULATION ================= */
//     const subTotal = price * quantity;
//     const taxAmount = Math.round((subTotal * gstRate) / 100);
//     const shippingFee = subTotal > 5000 ? 0 : 150;
//     const grandTotal = subTotal + taxAmount + shippingFee;

//     /* ================= IMAGE FORMAT (OLD STYLE) ================= */
//     const images = variant.images?.map((img) => ({
//       id: img.id,
//       url: img.url || img.imageUrl, // support both
//       isPrimary: img.isPrimary,
//     })) || [];

//     const primaryImage =
//       images.find((img) => img.isPrimary)?.url ||
//       images[0]?.url ||
//       null;

//     /* ================= RESPONSE ================= */
//     const data = [
//       {
//         cartId: Date.now(),
//         productId,
//         variantId,
//         sizeId,
//         title: product.title,
//         image: primaryImage,
//         images, // ✅ full images array (like before)

//         variant: {
//           color: variant.colorName,

//           // ✅ Only change here → use length & diameter
//           size: {
//             id: variantSize.id,
//             length: variantSize.length,
//             diameter: variantSize.diameter,
//           },

//           stock,
//           status: stock > 0 ? "In Stock" : "Out of Stock",
//           isAvailable: stock >= quantity,
//         },

//         price,
//         quantity,
//         total: subTotal,
//       },
//     ];

//     return res.json({
//       success: true,
//       data,
//       summary: {
//         itemsCount: 1,
//         totalQuantity: quantity,
//         subTotal,
//         tax: { amount: taxAmount },
//         shippingFee,
//         grandTotal,
//         currency: "INR",
//         canCheckout: stock >= quantity,
//       },
//     });
//   } catch (error) {
//     console.error("BUY NOW ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



const {
  Product,
  ProductVariant,
  VariantImage,
  Store,
  ProductAttribute,
  ProductMeasurement,
  MeasurementMaster,
} = require("../../../models");

const { StoreInventory } = require("../../../models");
const { getDeliveryCharge } = require("../../../utils/deliveryCharges");
const { getDistanceKm } = require("../../../utils/distance");
const priceService = require("../../../services/price.service");

exports.buyNowCheckout = async (req, res) => {
  try {
    const {
      productId,
      variantId,
      storeId,
      quantity = 1,
      latitude,
      longitude,
      deliveryType = "delivery",
    } = req.body;

    /* ---------------- VALIDATION ---------------- */

    if (!productId || !variantId || !storeId) {
      return res.status(400).json({
        success: false,
        message: "productId, variantId, storeId required",
      });
    }

    /* ---------------- PRODUCT + VARIANT ---------------- */

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: ProductAttribute,
          as: "attributes",
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          include: [{ model: MeasurementMaster, as: "measurement" }],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variant = await ProductVariant.findOne({
      where: { id: variantId, productId },
      include: [
        { model: VariantImage, as: "images", limit: 1 },
        {
          model: ProductAttribute,
          as: "attributes",
        },
        {
          model: ProductMeasurement,
          as: "measurements",
          include: [{ model: MeasurementMaster, as: "measurement" }],
        },
      ],
    });

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant",
      });
    }

    /* ---------------- STORE ---------------- */

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(400).json({
        success: false,
        message: "Store information missing",
      });
    }

    /* ---------------- INVENTORY ---------------- */

    const inventory = await StoreInventory.findOne({
      where: {
        storeId,
        productId,
        variantId,
      },
    });

    if (!inventory || inventory.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Out of stock",
      });
    }

    const validQty = Math.min(quantity, inventory.stock);

    /* ---------------- PRICE ---------------- */

    const priceResult = await priceService.getFinalPrice(
      variantId,
      validQty
    );

    const basePrice = Number(priceResult.price);
    const gstRate = Number(product.gstRate) || 0;

    const gstPerUnit = Math.round((basePrice * gstRate) / 100);
    const finalPerUnit = basePrice + gstPerUnit;

    const baseTotal = basePrice * validQty;
    const gstTotal = gstPerUnit * validQty;
    const finalTotal = finalPerUnit * validQty;

    /* ---------------- DELIVERY LOGIC ---------------- */

    let distanceKm = null;
    let isDeliveryAvailable = false;
    let availableOptions = ["pickup"];
    let selectedOption = "pickup";
    let message = "";

    if (latitude && longitude) {
      distanceKm = getDistanceKm(
        Number(latitude),
        Number(longitude),
        Number(store.latitude),
        Number(store.longitude)
      );

      const radius = store.deliveryRadius || 8;

      if (distanceKm <= radius) {
        isDeliveryAvailable = true;
        availableOptions = ["delivery", "pickup"];
        selectedOption =
          deliveryType === "pickup" ? "pickup" : "delivery";

        message = `Delivery available (${distanceKm.toFixed(2)} km)`;
      } else {
        message = `Delivery not available. Only pickup allowed`;
      }
    } else {
      message = "Location not provided. Pickup only.";
    }

    /* ---------------- SHIPPING ---------------- */

    let shippingFee = 0;

    if (selectedOption === "delivery" && isDeliveryAvailable) {
      const delivery = getDeliveryCharge(distanceKm, baseTotal);

      if (delivery.isServiceable) {
        shippingFee = delivery.deliveryCharge;
      } else {
        selectedOption = "pickup";
      }
    }

    const grandTotal = finalTotal + shippingFee;

    /* ---------------- RESPONSE ---------------- */

    return res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          title: product.title,
          attributes: product.attributes || [],
          measurements: product.measurements || [],
        },

        variant: {
          id: variant.id,
          images: variant.images || [],
          attributes: variant.attributes || [],
          measurements: variant.measurements || [],
          stock: inventory.stock,
        },

        pricingType: priceResult.type,

        price: {
          basePrice,
          gstRate,
          gstPerUnit,
          finalPerUnit,
        },

        quantity: validQty,

        totals: {
          baseTotal,
          gstTotal,
          finalTotal,
        },
      },

      summary: {
        subTotal: baseTotal,
        tax: gstTotal,
        shippingFee,
        grandTotal,

        distanceKm:
          distanceKm !== null
            ? Number(distanceKm.toFixed(2))
            : null,

        isDeliveryAvailable,
        availableOptions,
        selectedOption,

        message,

        store: {
          id: store.id,
          name: store.name,
          address: store.address,
        },

        canCheckout: inventory.stock > 0,
      },
    });
  } catch (error) {
    console.error("BUY NOW ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};