const sequelize = require("../config/db")

const User = require("./user.model")
// Category
const Category = require("./category/category.model")
const SubCategory = require("./category/subcategory.model")
const ProductCategory = require("./category/productCategory.model")

// Product core
const Product = require("./products/product.model")
const ProductRating = require("./products/productRating.model")
const ProductReview = require("./products/productReview.model")
const ProductSpec = require("./products/productSpec.model")
const ProductPrice = require("./products/price.model")

// Variants
const ProductVariant = require("./productVariants/productVariant.model")
const VariantImage = require("./productVariants/variantImage.model")
const VariantSize = require("./productVariants/variantSize.model")

//Offers
const Offer = require("./offers/offer.model")
const OfferSub = require("./offers/offerSub.model")
const OfferApplicableCategory = require("./offers/offerApplicableCategory.model")
const OfferApplicableProduct = require("./offers/offerApplicableProduct.model")

//orders
const CartItem = require("./orders/cart.model");
const Order = require('./orders/order.model');
const OrderItem = require('./orders/orderItem.model');
const OrderAddress = require('./orders/orderAddress.model');
const UserAddress = require("./orders/userAddress.model")

//wishlist
const Wishlist = require("./wishlist.model");
const DeliveryBoy = require("./orders/deliveryBoy.model")
//featuured Category
const FeaturedCategory = require("./featuredCategories/featured_categories.model")





// SubCategory Relations
Category.hasMany(SubCategory, {foreignKey: "categoryId",as: "subcategories"})
SubCategory.belongsTo(Category, {foreignKey: "categoryId",as: "category"})

//ProductCategory relations
Category.hasMany(ProductCategory, {foreignKey: "categoryId",as: "productCategories"})
SubCategory.hasMany(ProductCategory, { foreignKey: "subCategoryId", as: "productCategories"})

ProductCategory.belongsTo(Category, {foreignKey: "categoryId",as: "category"})
ProductCategory.belongsTo(SubCategory, {foreignKey: "subCategoryId",as: "subCategory"})

// Product relations
Category.hasMany(Product, { foreignKey: "categoryId" })
SubCategory.hasMany(Product, { foreignKey: "subCategoryId" })
ProductCategory.hasMany(Product, { foreignKey: "productCategoryId" })

Product.belongsTo(Category, { foreignKey: "categoryId" })
Product.belongsTo(SubCategory, { foreignKey: "subCategoryId" })
Product.belongsTo(ProductCategory, { foreignKey: "productCategoryId" })



//productRating Relations
Product.hasOne(ProductRating, {foreignKey: "productId",as: "rating"})
ProductRating.belongsTo(Product, {foreignKey: "productId"})

//ProductReview Relations
Product.hasMany(ProductReview, {foreignKey: "productId",as: "reviews"})
ProductReview.belongsTo(Product, {foreignKey: "productId"})

//ProductSpec Relations
Product.hasMany(ProductSpec, {foreignKey: "productId",as: "specs"})
ProductSpec.belongsTo(Product, {foreignKey: "productId",as: "product"})

//productPrice Relations
Product.hasOne(ProductPrice, { foreignKey: 'productId',as: "price"});
ProductPrice.belongsTo(Product, {foreignKey: "productId",as: "product"})

        //ProductVariant Relations
// This is the missing link!
Product.hasMany(ProductVariant, { foreignKey: "productId", as: "variants" });
ProductVariant.belongsTo(Product, { foreignKey: "productId", as: "product" });

// Ensure your variant sub-items are also linked
ProductVariant.hasMany(VariantImage, { foreignKey: "variantId", as: "images" });
VariantImage.belongsTo(ProductVariant, { foreignKey: "variantId" });

ProductVariant.hasMany(VariantSize, { foreignKey: "variantId", as: "sizes" });
VariantSize.belongsTo(ProductVariant, { foreignKey: "variantId" });


//offer Relations
Product.hasMany(OfferApplicableProduct, { foreignKey: "productId", as: "offerApplicableProducts" });
OfferApplicableProduct.belongsTo(Product, { foreignKey: "productId" });

Offer.hasMany(OfferSub, { foreignKey: "offerId", as: "subOffers" })
Offer.hasMany(OfferApplicableCategory, {foreignKey: "offerId", as: "applicableCategories"})
Offer.hasMany(OfferApplicableProduct, {foreignKey: "offerId", as: "offerApplicableProducts"})

OfferSub.belongsTo(Offer, { foreignKey: "offerId" })
OfferApplicableCategory.belongsTo(Offer, { foreignKey: "offerId" })
OfferApplicableProduct.belongsTo(Offer, { foreignKey: "offerId", as: "offerDetails" });


// --- CART RELATIONS (FIXED) ---
User.hasMany(CartItem, { foreignKey: "userId", onDelete: "CASCADE" });
CartItem.belongsTo(User, { foreignKey: "userId" });

Product.hasMany(CartItem, { foreignKey: "productId", onDelete: "CASCADE" });
CartItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

ProductVariant.hasMany(CartItem, { foreignKey: "variantId", onDelete: "CASCADE" });
CartItem.belongsTo(ProductVariant, { foreignKey: "variantId", as: "variant" });

// --- ORDER RELATIONS (FIXED) ---
User.hasMany(Order, { foreignKey: "userId", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: "userId" });

Order.hasMany(OrderItem, { foreignKey: "orderId", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

Order.hasOne(OrderAddress, { foreignKey: "orderId", as: "address", onDelete: "CASCADE" });
OrderAddress.belongsTo(Order, { foreignKey: "orderId", as: "order", });

// Important for historical tracking
Product.hasMany(OrderItem, { foreignKey: "productId", onDelete: "CASCADE" });
OrderItem.belongsTo(Product, { foreignKey: "productId" });

CartItem.belongsTo(VariantSize, { foreignKey: "sizeId", as: "variantSize" });

VariantSize.hasMany(CartItem, { foreignKey: "sizeId", as: "cartItems" });

Order.belongsTo(DeliveryBoy, { foreignKey: "deliveryBoyId", as: "deliveryBoy" });
DeliveryBoy.hasMany(Order, { foreignKey: "deliveryBoyId" });


// --- ORDER ITEM PRODUCT VARIANT RELATIONS (MISSING FIX) ---

// OrderItem → ProductVariant
ProductVariant.hasMany(OrderItem, { foreignKey: "variantId" });
OrderItem.belongsTo(ProductVariant, { foreignKey: "variantId" });

// OrderItem → VariantSize
VariantSize.hasMany(OrderItem, { foreignKey: "sizeId" });
OrderItem.belongsTo(VariantSize, { foreignKey: "sizeId" });

User.hasMany(UserAddress, { foreignKey: "userId", as: "addresses" });
UserAddress.belongsTo(User, { foreignKey: "userId" });


//wishlist

User.hasMany(Wishlist, { foreignKey: "userId" });
Wishlist.belongsTo(User, { foreignKey: "userId" });

Product.hasMany(Wishlist, { foreignKey: "productId" });
Wishlist.belongsTo(Product, { foreignKey: "productId" });

ProductVariant.hasMany(Wishlist, { foreignKey: "variantId" });
Wishlist.belongsTo(ProductVariant, { foreignKey: "variantId" });

Category.hasMany(FeaturedCategory, {foreignKey: "categoryId", as: "featuredEntries"});
FeaturedCategory.belongsTo(Category, {foreignKey: "categoryId", as: "category"});

module.exports = {
  sequelize,
  Category,
  SubCategory,
  ProductCategory,
  Product,
  ProductPrice,
  ProductRating,
  ProductReview,
  ProductSpec,
  ProductVariant,
  VariantImage,
  VariantSize,
  Offer,
  OfferSub,
  OfferApplicableCategory,
  OfferApplicableProduct,
  User,
  CartItem, 
  Order, 
  OrderItem, 
  OrderAddress,
  Wishlist,
  FeaturedCategory
}
