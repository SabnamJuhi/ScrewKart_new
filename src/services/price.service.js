const ProductPrice = require("../models/products/price.model");

/**
 * Create or update variant price
 */
exports.upsert = async (productId, variantId, price, transaction) => {

  const calculatedPrice = exports.calculatePrice(price);

  const [row, created] = await ProductPrice.findOrCreate({
    where: { variantId },  
    defaults: {
      variantId,
      ...calculatedPrice,
      currency: price.currency || "INR",
    },
    transaction,
  });

  // update if already exists
  if (!created) {
    await row.update(
      {
        productId,
        ...calculatedPrice,
        currency: price.currency || "INR",
      },
      { transaction }
    );
  }

  return row;
};


/**
 * Dynamic Price Calculation
 * Admin can provide either sellingPrice OR discountPercentage
 */
exports.calculatePrice = ({ mrp, sellingPrice, discountPercentage }) => {

  if (!mrp) {
    throw new Error("MRP is required");
  }

  mrp = Number(mrp);

  // CASE 1 → Admin gives discount %
  if (discountPercentage !== undefined && discountPercentage !== null) {

    discountPercentage = Number(discountPercentage);

    sellingPrice = mrp - (mrp * discountPercentage) / 100;
  }

  // CASE 2 → Admin gives selling price
  else if (sellingPrice !== undefined && sellingPrice !== null) {

    sellingPrice = Number(sellingPrice);

    discountPercentage = ((mrp - sellingPrice) / mrp) * 100;
  }

  else {
    throw new Error("Either sellingPrice or discountPercentage must be provided");
  }

  return {
    mrp,
    sellingPrice: Math.round(sellingPrice),
    discountPercentage: Math.round(discountPercentage),
  };
};