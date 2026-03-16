// const { Op } = require("sequelize");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const Category = require("../../models/category/category.model");
// const SubCategory = require("../../models/category/subcategory.model");
// const Wishlist = require("../../models/wishlist.model");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       sizes,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//     } = req.query;
//     const userId = req.user?.id;
//     const paginationOptions = getPaginationOptions(req.query);
//     const { limit, offset, currentPage } = paginationOptions;
//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------- product where ---------- */
//    const productWhere = {};

// if (req.query.isActive !== undefined) {
//   productWhere.isActive = req.query.isActive === "true";
// }

//     /* ---------- CATEGORY + SUBCATEGORY + PRODUCTCATEGORY (FIXED LOGIC) ---------- */

// const categories = toArray(categoryId).map(Number);
// const subCategories = toArray(subCategoryId).map(Number);
// const productCategories = toArray(productCategoryId).map(Number);

// if (categories.length) {
//   const orConditions = [];

//   categories.forEach((catId) => {
//     const condition = { categoryId: catId };

//     // Apply subCategory & productCategory filters ONLY if they exist
//     if (subCategories.length) {
//       condition.subCategoryId = { [Op.in]: subCategories };
//     }

//     if (productCategories.length) {
//       condition.productCategoryId = { [Op.in]: productCategories };
//     }

//     orConditions.push(condition);
//   });

//   productWhere[Op.or] = orConditions;
// }

//     if (brands) productWhere.brandName = { [Op.in]: toArray(brands) };

//     /* ---------- price ---------- */
//     const priceWhere = {};
//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------- spec FILTER include (for WHERE) ---------- */
//     const specFilterIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         const values = toArray(value);

//         specFilterIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           attributes: [], //  used only for filtering
//           where: {
//             specKey: key,
//             specValue: {
//               [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })),
//             },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------- MAIN QUERY ---------- */
//     const products = await Product.findAll({
//       where: productWhere,
//       attributes: [
//         "id",
//         "sku",
//         "title",
//         "brandName",
//         "badge",
//         "isActive",
//         "createdAt",
//       ],
//       include: [
//         /* CATEGORY */
//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//         },

//         /* SUBCATEGORY */
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//         },

//         /* PRICE */
//         {
//           model: ProductPrice,
//           as: "price",
//           where: Object.keys(priceWhere).length ? priceWhere : undefined,
//           required: Object.keys(priceWhere).length > 0,
//         },

//         /* ALL SPECS (always returned) */
//         {
//           model: ProductSpec,
//           as: "specs",
//           attributes: ["id", "specKey", "specValue"],
//           required: false,
//         },

//         /* VARIANTS */
//         {
//           model: ProductVariant,
//           as: "variants",
//           where: { isActive: true },
//           required: false,
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               required: false,
//             },
//           ],
//         },

//         /* SPEC FILTERING JOIN */
//         ...specFilterIncludes,
//       ],

//       order: [["createdAt", "DESC"]],
//       distinct: true,
//     });

//     /* ---------- POST FILTERS ---------- */
//     let filteredProducts = products;

//     if (colors) {
//       const colorArray = toArray(colors).map((c) => c.toLowerCase());
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) =>
//           colorArray.includes((v.colorName || "").toLowerCase()),
//         ),
//       );
//     }

//     if (sizes) {
//       const sizeArray = toArray(sizes);
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) => v.sizes.some((s) => sizeArray.includes(s.size))),
//       );
//     }

//     if (inStock === "true") {
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some(
//           (v) => v.totalStock > 0 && v.sizes.some((s) => s.stock > 0),
//         ),
//       );
//     }
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     const finalProducts = filteredProducts.map((p) => {
//       const productWishlisted = !!wishlistedMap[p.id];
//             return {
//             ...p.toJSON(),
//             isWishlisted: productWishlisted,
//             wishlistedVariants: wishlistedMap[p.id] || [],
//       };
//     });
//      /* ---------- MANUAL PAGINATION ---------- */
//     const totalCount = finalProducts.length;

//     const paginatedRows = finalProducts.slice(offset, offset + limit);

//     const response = formatPagination(
//       { count: totalCount, rows: paginatedRows },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// const { Op } = require("sequelize");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const Category = require("../../models/category/category.model");
// const SubCategory = require("../../models/category/subcategory.model");
// const Wishlist = require("../../models/wishlist.model");

// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       sizes,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//       isActive,
//     } = req.query;

//     const userId = req.user?.id;

//     const { limit, offset, currentPage } = getPaginationOptions(req.query);

//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------------- PRODUCT WHERE ---------------- */
//     const productWhere = {};

//     if (isActive !== undefined) {
//       productWhere.isActive = isActive === "true";
//     }

//     if (brands) {
//       productWhere.brandName = { [Op.in]: toArray(brands) };
//     }

//     if (categoryId) {
//       productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };
//     }

//     if (subCategoryId) {
//       productWhere.subCategoryId = {
//         [Op.in]: toArray(subCategoryId).map(Number),
//       };
//     }

//     if (productCategoryId) {
//       productWhere.productCategoryId = {
//         [Op.in]: toArray(productCategoryId).map(Number),
//       };
//     }

//     /* ---------------- PRICE FILTER ---------------- */
//     const priceWhere = {};
//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------------- SPEC FILTER ---------------- */
//     const specFilterIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         specFilterIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           attributes: [],
//           where: {
//             specKey: key,
//             specValue: {
//               [Op.or]: toArray(value).map((v) => ({
//                 [Op.like]: `%${v}%`,
//               })),
//             },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------------- SIZE FILTER LOGIC ---------------- */
//     let sizeConditions = null;

//     if (sizes) {
//       // sizeConditions = {
//       //   [Op.or]: toArray(sizes).map((val) => {
//       //     const [diameter, length] = val.split("-");
//       //     return {
//       //       diameter: Number(diameter),
//       //       length: Number(length),
//       //     };
//       //   }),
//       // };
//       sizeConditions = {
//         [Op.or]: toArray(sizes).map((val) => {
//           // Remove spaces
//           const cleaned = val.replace(/\s/g, "");

//           // Remove leading M
//           const withoutM = cleaned.replace(/^M/i, "");

//           // Split by × or x
//           const [diameter, length] = withoutM.split(/×|x/i);

//           return {
//             diameter: Number(diameter),
//             length: Number(length),
//           };
//         }),
//       };
//     }

//     /* ---------------- MAIN QUERY ---------------- */
//     const products = await Product.findAll({
//       where: productWhere,
//       distinct: true,
//       order: [["createdAt", "DESC"]],
//       include: [
//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//           where: { isActive: true },
//           required: true,
//         },
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//           where: { isActive: true },
//           required: true,
//         },
//         {
//           model: ProductPrice,
//           as: "price",
//           where: Object.keys(priceWhere).length > 0 ? priceWhere : undefined,
//           required: Object.keys(priceWhere).length > 0,
//         },
//         {
//           model: ProductSpec,
//           as: "specs",
//           attributes: ["id", "specKey", "specValue"],
//           required: false,
//         },

//         /* ---------- VARIANTS (FILTERED CORRECTLY) ---------- */
//         {
//           model: ProductVariant,
//           as: "variants",
//           required: !!colors || !!sizes || inStock === "true",
//           where: {
//             isActive: true,
//             ...(colors && {
//               colorName: { [Op.in]: toArray(colors) },
//             }),
//             ...(inStock === "true" && {
//               totalStock: { [Op.gt]: 0 },
//             }),
//           },
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               required: !!sizes || inStock === "true",
//               where: sizeConditions
//                 ? sizeConditions
//                 : inStock === "true"
//                   ? { stock: { [Op.gt]: 0 } }
//                   : undefined,
//             },
//           ],
//         },

//         ...specFilterIncludes,
//       ],
//     });

//     /* ---------------- WISHLIST ---------------- */
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     /* ---------------- FORMAT RESPONSE ---------------- */
//     const finalProducts = products.map((p) => {
//       const product = p.toJSON();

//       product.variants = product.variants.map((v) => {
//         v.sizes = v.sizes.map((s) => ({
//           ...s,
//           displaySize: `M${s.diameter} × ${s.length}`,
//         }));
//         return v;
//       });

//       return {
//         ...product,
//         isWishlisted: !!wishlistedMap[p.id],
//         wishlistedVariants: wishlistedMap[p.id] || [],
//       };
//     });

//     /* ---------------- PAGINATION ---------------- */
//     const totalCount = finalProducts.length;
//     const paginatedRows = finalProducts.slice(offset, offset + limit);

//     const response = formatPagination(
//       { count: totalCount, rows: paginatedRows },
//       currentPage,
//       limit,
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };




// const { Op } = require("sequelize");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const Category = require("../../models/category/category.model");
// const SubCategory = require("../../models/category/subcategory.model");
// const Wishlist = require("../../models/wishlist.model");

// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//       isActive,
//       diameter,
//       length,
//     } = req.query;

//     const userId = req.user?.id;

//     const { limit, offset, currentPage } = getPaginationOptions(req.query);

//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------------- PRODUCT WHERE ---------------- */
//     const productWhere = {};

//     if (isActive !== undefined) {
//       productWhere.isActive = isActive === "true";
//     }

//     if (brands) {
//       productWhere.brandName = { [Op.in]: toArray(brands) };
//     }

//     if (categoryId) {
//       productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };
//     }

//     if (subCategoryId) {
//       productWhere.subCategoryId = {
//         [Op.in]: toArray(subCategoryId).map(Number),
//       };
//     }

//     if (productCategoryId) {
//       productWhere.productCategoryId = {
//         [Op.in]: toArray(productCategoryId).map(Number),
//       };
//     }

//     /* ---------------- PRICE FILTER ---------------- */
//     const priceWhere = {};
//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------------- SPEC FILTER ---------------- */
//     const specFilterIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         specFilterIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           attributes: [],
//           where: {
//             specKey: key,
//             specValue: {
//               [Op.or]: toArray(value).map((v) => ({
//                 [Op.like]: `%${v}%`,
//               })),
//             },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------------- SIZE FILTER LOGIC ---------------- */
//     let sizeConditions = {};

//     if (diameter) {
//       sizeConditions.diameter = Number(diameter);
//     }

//     if (length) {
//       sizeConditions.length = Number(length);
//     }

//     if (Object.keys(sizeConditions).length === 0) {
//       sizeConditions = null;
//     }

//     /* ---------------- MAIN QUERY ---------------- */
//     const products = await Product.findAll({
//       where: productWhere,
//       distinct: true,
//       subQuery: false,
//       order: [["createdAt", "DESC"]],
//       include: [
//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//           where: { isActive: true },
//           required: true,
//         },
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//           where: { isActive: true },
//           required: true,
//         },
//         {
//           model: ProductPrice,
//           as: "price",
//           where: Object.keys(priceWhere).length > 0 ? priceWhere : undefined,
//           required: Object.keys(priceWhere).length > 0,
//         },
//         {
//           model: ProductSpec,
//           as: "specs",
//           attributes: ["id", "specKey", "specValue"],
//           required: false,
//         },
//         {
//           model: ProductVariant,
//           as: "variants",
//           required:
//             !!colors ||
//             !!sizeConditions ||
//             inStock === "true",
//           where: {
//             isActive: true,
//             ...(colors && {
//               colorName: { [Op.in]: toArray(colors) },
//             }),
//             ...(inStock === "true" && {
//               totalStock: { [Op.gt]: 0 },
//             }),
//           },
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               required:
//                 !!sizeConditions ||
//                 inStock === "true",
//               where: sizeConditions
//                 ? sizeConditions
//                 : inStock === "true"
//                 ? { stock: { [Op.gt]: 0 } }
//                 : undefined,
//             },
//           ],
//         },
//         ...specFilterIncludes,
//       ],
//     });

//     /* ---------------- WISHLIST ---------------- */
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     /* ---------------- FORMAT RESPONSE ---------------- */
//     const finalProducts = products.map((p) => {
//       const product = p.toJSON();

//       product.variants = product.variants.map((v) => {
//         v.sizes = v.sizes.map((s) => ({
//           ...s,
//           displaySize: `M${s.diameter} × ${s.length}`,
//         }));
//         return v;
//       });

//       return {
//         ...product,
//         isWishlisted: !!wishlistedMap[p.id],
//         wishlistedVariants: wishlistedMap[p.id] || [],
//       };
//     });

//     /* ---------------- PAGINATION ---------------- */
//     const totalCount = finalProducts.length;
//     const paginatedRows = finalProducts.slice(offset, offset + limit);

//     const response = formatPagination(
//       { count: totalCount, rows: paginatedRows },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       ...response,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };




const { Op } = require("sequelize");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const VariantImage = require("../../models/productVariants/variantImage.model");

const Offer = require("../../models/offers/offer.model");
const OfferSub = require("../../models/offers/offerSub.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

const Wishlist = require("../../models/wishlist.model");

const { Category, SubCategory, ProductCategory } = require("../../models");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

exports.getFilteredProducts = async (req, res) => {
  try {
    const {
      categoryId,
      subCategoryId,
      productCategoryId,
      brands,
      minPrice,
      maxPrice,
      inStock,
      specs,
      isActive,
      diameter,
      length,
      grade,
      finish,
      material,
      threadType,
      packQuantity,
      search,
    } = req.query;

    const userId = req.user?.id;

    const { limit, offset, currentPage } = getPaginationOptions(req.query);

    const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

    /* ---------------- PRODUCT WHERE ---------------- */
    const productWhere = {};

    if (isActive !== undefined) {
      productWhere.isActive = isActive === "true";
    }

    if (brands) {
      productWhere.brandName = { [Op.in]: toArray(brands) };
    }

    if (categoryId) {
      productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };
    }

    if (subCategoryId) {
      productWhere.subCategoryId = {
        [Op.in]: toArray(subCategoryId).map(Number),
      };
    }

    if (productCategoryId) {
      productWhere.productCategoryId = {
        [Op.in]: toArray(productCategoryId).map(Number),
      };
    }

    if (search) {
      productWhere[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { brandName: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }

    /* ---------------- PRICE FILTER ---------------- */
    const priceWhere = {};
    if (minPrice || maxPrice) {
      priceWhere.sellingPrice = {};
      if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
      if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
    }

    /* ---------------- SPEC FILTER ---------------- */
    const specFilterIncludes = [];

    if (specs && typeof specs === "object") {
      Object.entries(specs).forEach(([key, value]) => {
        specFilterIncludes.push({
          model: ProductSpec,
          as: "specs",
          attributes: [],
          where: {
            specKey: key,
            specValue: {
              [Op.or]: toArray(value).map((v) => ({
                [Op.like]: `%${v}%`,
              })),
            },
          },
          required: true,
        });
      });
    }

    /* ---------------- SIZE FILTER LOGIC ---------------- */
    let sizeConditions = {};

    if (diameter) {
      sizeConditions.diameter = Number(diameter);
    }

    if (length) {
      sizeConditions.length = Number(length);
    }

    if (Object.keys(sizeConditions).length === 0) {
      sizeConditions = null;
    }

    /* ---------------- VARIANT ATTRIBUTE FILTERS ---------------- */
    const variantWhere = {
      isActive: true,
      ...(inStock === "true" && { totalStock: { [Op.gt]: 0 } }),
      ...(grade && { grade: { [Op.in]: toArray(grade).map(Number) } }),
      ...(finish && { finish: { [Op.in]: toArray(finish) } }),
      ...(material && { material: { [Op.in]: toArray(material) } }),
      ...(threadType && { threadType: { [Op.in]: toArray(threadType) } }),
      ...(packQuantity && { packQuantity: { [Op.in]: toArray(packQuantity).map(Number) } }),
    };

    /* ---------------- MAIN QUERY ---------------- */
    const products = await Product.findAndCountAll({
      where: productWhere,
      attributes: [
        "id",
        "sku",
        "title",
        "description",
        "brandName",
        "badge",
        "gstRate",
        "isActive",
        "createdAt",
        "updatedAt",
        "wishlistCount",
        "soldCount",
      ],
      distinct: true,
      subQuery: false,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Category,
          as: "Category",
          attributes: ["id", "name"],
          where: { isActive: true },
          required: true,
        },
        {
          model: SubCategory,
          as: "SubCategory",
          attributes: ["id", "name"],
          where: { isActive: true },
          required: true,
        },
        {
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
          required: true,
        },
        {
          model: ProductSpec,
          as: "specs",
          attributes: ["id", "specKey", "specValue"],
          required: false,
        },
        {
          model: ProductVariant,
          as: "variants",
          required:
            !!sizeConditions ||
            inStock === "true" ||
            !!grade ||
            !!finish ||
            !!material ||
            !!threadType ||
            !!packQuantity ||
            Object.keys(priceWhere).length > 0,
          where: variantWhere,
          attributes: [
            "id",
            "variantCode",
            "packQuantity",
            "finish",
            "grade",
            "material",
            "threadType",
            "totalStock",
            "stockStatus",
            "isActive",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              required: false,
            },
            {
              model: VariantSize,
              as: "sizes",
              required:
                !!sizeConditions ||
                inStock === "true",
              where: sizeConditions
                ? sizeConditions
                : inStock === "true"
                ? { stock: { [Op.gt]: 0 } }
                : undefined,
              attributes: ["id", "length", "diameter", "approxWeightKg", "stock"],
            },
            {
              model: ProductPrice,
              as: "price",
              attributes: ["id", "mrp", "sellingPrice", "discountPercentage", "currency"],
              required: Object.keys(priceWhere).length > 0,
              where: Object.keys(priceWhere).length > 0 ? priceWhere : undefined,
            },
          ],
        },
        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          required: false,
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id",
                "offerCode",
                "title",
                "festival",
                "description",
                "startDate",
                "endDate",
                "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id",
                    "discountType",
                    "discountValue",
                    "maxDiscount",
                    "minOrderValue",
                  ],
                },
              ],
            },
          ],
        },
        ...specFilterIncludes,
      ],
    });

    /* ---------------- WISHLIST MAP ---------------- */
    let wishlistedMap = {};

    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    /* ---------------- FORMAT RESPONSE ---------------- */
    const finalProducts = products.rows.map((p) => {
      const product = p.toJSON();

      if (product.variants) {
        product.variants = product.variants.map((variant) => {
          if (variant.sizes) {
            variant.sizes = variant.sizes.map((size) => ({
              id: size.id,
              diameter: size.diameter,
              length: size.length,
              approxWeightKg: size.approxWeightKg,
              stock: size.stock,
              display: size.diameter && size.length 
                ? `M${size.diameter} × ${size.length}${size.approxWeightKg ? ` (${size.approxWeightKg}kg)` : ''}`
                : size.diameter 
                  ? `D${size.diameter}`
                  : size.length 
                    ? `L${size.length}`
                    : 'Standard',
              value: size.diameter && size.length 
                ? `${size.diameter}-${size.length}`
                : size.diameter 
                  ? `${size.diameter}`
                  : size.length 
                    ? `${size.length}`
                    : 'std',
            }));
          }

          // Add variant images with primary flag
          if (variant.images && variant.images.length > 0) {
            variant.primaryImage = variant.images.find(img => img.isPrimary)?.imageUrl || variant.images[0]?.imageUrl;
            variant.imageCount = variant.images.length;
          }

          return variant;
        });
      }

      // Process specs into key-value object for easier access
      if (product.specs && product.specs.length > 0) {
        product.specsObject = product.specs.reduce((acc, spec) => {
          acc[spec.specKey] = spec.specValue;
          return acc;
        }, {});
      }

      // Process offers
      if (product.offerApplicableProducts && product.offerApplicableProducts.length > 0) {
        product.activeOffers = product.offerApplicableProducts
          .filter(oap => oap.offerDetails?.isActive)
          .map(oap => ({
            offerId: oap.offerId,
            subOfferId: oap.subOfferId,
            ...oap.offerDetails,
          }));
      }

      // Calculate price range from variants
      let minPrice = Infinity;
      let maxPrice = 0;
      let minSellingPrice = Infinity;
      let maxSellingPrice = 0;

      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.price) {
            minPrice = Math.min(minPrice, Number(variant.price.mrp));
            maxPrice = Math.max(maxPrice, Number(variant.price.mrp));
            minSellingPrice = Math.min(minSellingPrice, Number(variant.price.sellingPrice));
            maxSellingPrice = Math.max(maxSellingPrice, Number(variant.price.sellingPrice));
          }
        });
      }

      const priceRange = {
        minMrp: minPrice !== Infinity ? minPrice : product.price?.mrp || 0,
        maxMrp: maxPrice !== 0 ? maxPrice : product.price?.mrp || 0,
        minSellingPrice: minSellingPrice !== Infinity ? minSellingPrice : product.price?.sellingPrice || 0,
        maxSellingPrice: maxSellingPrice !== 0 ? maxSellingPrice : product.price?.sellingPrice || 0,
        hasVariants: product.variants && product.variants.length > 0,
        currency: product.price?.currency || "INR",
      };

      return {
        ...product,
        priceRange,
        isWishlisted: !!wishlistedMap[product.id],
        wishlistedVariants: wishlistedMap[product.id] || [],
        hasMultipleVariants: product.variants && product.variants.length > 1,
        totalStock: product.variants?.reduce((sum, v) => sum + (v.totalStock || 0), 0) || 0,
        availableVariants: product.variants?.filter(v => v.totalStock > 0).length || 0,
      };
    });

    /* ---------------- PAGINATION ---------------- */
    const totalCount = finalProducts.length;
    const paginatedRows = finalProducts.slice(offset, offset + limit);

    const response = formatPagination(
      { count: totalCount, rows: paginatedRows },
      currentPage,
      limit
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("FILTER PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};