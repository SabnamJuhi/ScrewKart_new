const express = require("express")
const cors = require("cors")
const path = require('path');
const passport = require("passport")
require("./config/passport");

const app = express()
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://screwkart.in",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());


app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/admin", require("./routes/admin.auth.routes"))
app.use("/api/auth", require("./routes/user.auth.routes"));

app.use("/api/categories", require("./routes/category/category.routes"))
app.use("/api/subcategories", require("./routes/category/subcategory.routes"))
app.use("/api/productCategories", require("./routes/category/productCategory.routes"))

app.use("/api/products", require("./routes/products/product.routes"))
app.use("/api/productSpec", require("./routes/products/productSpec.routes"))
app.use("/api/reviews", require("./routes/products/review.routes"))
app.use("/api/ratings", require("./routes/products/rating.routes"))
app.use("/api/prices", require("./routes/products/price.routes"))

app.use("/api/variants", require("./routes/variants/productVariant.routes"))

app.use("/api/offers", require("./routes/offers/offer.routes"))

app.use("/api/aggregate", require("./routes/products/product.Agreegate.route"))


app.use("/api/cart", require("./routes/order/cart.routes"))
app.use("/api/order", require("./routes/order/order.routes"))
// app.use("/api/icici", require("./routes/icici"));

// // This line is crucial: It makes http://localhost:5000/uploads/... accessible
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use("/api/wishlist", require("./routes/wishlist/wishlist.routes"))
app.use("/api/bulkorder", require("./routes/BulkUploadRoute/bulkUpload.route"))

app.use("/api/contact", require("./routes/contact/contact.routes"));

app.use("/api/banners", require("./routes/banner/banner.routes"));

app.use("/api/checkout", require("./routes/checkout/checkout.routes"));

app.use("/api/featuredCategories", require("./routes/featuedCategory/featureCategory.route"));

app.use("/api/dashboard", require("./routes/adminDashboardStates/adminDashboardStats.routes"))

app.use("/api/search", require("./routes/searchServices/searchServices.routes"))

app.use('/api/faqs', require('./routes/faq/faq.routes'));

app.use('/api/stores', require("./routes/store/store.routes"))


app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});


module.exports = app
