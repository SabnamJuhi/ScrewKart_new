const ProductPrice = require("../models/products/price.model");
const VariantPricingSlab = require("../models/products/variantPricingSlab.model");

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
      { transaction },
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
  } else {
    throw new Error(
      "Either sellingPrice or discountPercentage must be provided",
    );
  }

  return {
    mrp,
    sellingPrice: Math.round(sellingPrice),
    discountPercentage: Math.round(discountPercentage),
  };
};

/* =========================================================
   3. CREATE PRICING SLABS (DYNAMIC)
========================================================= */
exports.createPricingSlabs = async (variantId, slabs, transaction) => {
  if (!Array.isArray(slabs) || slabs.length === 0) return;

  // 🔥 STEP 1: SORT SLABS
  slabs.sort((a, b) => a.minQty - b.minQty);

  // 🔥 STEP 2: VALIDATE SLABS
  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];

    if (s.minQty === undefined || s.price === undefined) {
      throw new Error(`Invalid slab at index ${i}`);
    }

    if (s.maxQty !== null && s.maxQty !== undefined) {
      if (s.maxQty < s.minQty) {
        throw new Error(`maxQty must be >= minQty at index ${i}`);
      }
    }

    // ❌ Overlapping check
    if (i < slabs.length - 1) {
      const next = slabs[i + 1];

      if (s.maxQty !== null && s.maxQty >= next.minQty) {
        throw new Error("Pricing slabs are overlapping");
      }
    }
  }

  // 🔥 STEP 3: ENSURE LAST SLAB IS OPEN (optional but recommended)
  const lastSlab = slabs[slabs.length - 1];
  if (lastSlab.maxQty !== null) {
    throw new Error("Last slab must have maxQty = null (infinite range)");
  }

  // 🔥 STEP 4: DELETE OLD SLABS (important for update case)
  await VariantPricingSlab.destroy({
    where: { variantId },
    transaction,
  });

  // 🔥 STEP 5: INSERT NEW SLABS
  await VariantPricingSlab.bulkCreate(
    slabs.map((s) => ({
      variantId,
      minQty: s.minQty,
      maxQty: s.maxQty ?? null,
      price: s.price,
    })),
    { transaction },
  );
};

/* =========================================================
   4. GET PRICE FROM SLABS ONLY
========================================================= */
exports.getPriceByQuantity = async (variantId, quantity) => {
  const slabs = await VariantPricingSlab.findAll({
    where: { variantId },
    order: [["minQty", "ASC"]],
  });

  for (let slab of slabs) {
    if (
      quantity >= slab.minQty &&
      (slab.maxQty === null || quantity <= slab.maxQty)
    ) {
      return slab.price;
    }
  }

  return null;
};

/* =========================================================
   5. FINAL PRICE (SLAB + FALLBACK)
========================================================= */
exports.getFinalPrice = async (variantId, quantity) => {
  // 🔥 Try slab pricing first
  const slabPrice = await exports.getPriceByQuantity(variantId, quantity);

  if (slabPrice !== null) {
    return {
      price: slabPrice,
      type: "SLAB",
    };
  }

  // 🔥 fallback to base price
  const basePrice = await ProductPrice.findOne({
    where: { variantId },
  });

  return {
    price: basePrice?.sellingPrice || 0,
    type: "BASE",
  };
};
