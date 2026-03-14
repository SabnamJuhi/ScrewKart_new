const Product = require("../../models/products/product.model")





// CREATE PRODUCT
 
// exports.createProduct = async (req, res) => {
//   try {
//     const product = await Product.create(req.body)
//     await buildProductView(product.id)
//     res.status(201).json({
//       message: "Product created successfully",
//       data: product
//     })
//   } catch (error) {
//     res.status(400).json({
//       message: "Failed to create product",
//       error: error.message
//     })
//   }
// }
exports.createProduct = async (req, res) => {
  try {
    const product = await createProductService(req.body)
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}


// GET ALL PRODUCTS
 
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]]
    })

    res.status(200).json({
      total: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message
    })
  }
}

// GET PRODUCT BY ID
 
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findByPk(id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.status(200).json(product)
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message
    })
  }
}

//GET PRODUCT BY CATEGORY
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params

    const products = await Product.findAll({
      where: {
        categoryId,
        isActive: true
      }
    })

    res.status(200).json({
      total: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products by category",
      error: error.message
    })
  }
}

 // GET PRODUCTS BY SUB CATEGORY
 
exports.getProductsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params

    const products = await Product.findAll({
      where: {
        subCategoryId,
        isActive: true
      }
    })

    res.status(200).json({
      total: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products by subcategory",
      error: error.message
    })
  }
}

// GET PRODUCTS BY PRODUCT CATEGORY (MAPPING TABLE)
 
exports.getProductsByProductCategory = async (req, res) => {
  try {
    const { productCategoryId } = req.params

    const products = await Product.findAll({
      where: {
        productCategoryId,
        isActive: true
      }
    })

    res.status(200).json({
      total: products.length,
      data: products
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products by product category",
      error: error.message
    })
  }
}

// UPDATE PRODUCT
 
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findByPk(id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    await product.update(req.body)

    res.status(200).json({
      message: "Product updated successfully",
      data: product
    })
  } catch (error) {
    res.status(400).json({
      message: "Failed to update product",
      error: error.message
    })
  }
}

// SOFT DELETE PRODUCT
 
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findByPk(id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    await product.update({ isActive: false })

    res.status(200).json({
      message: "Product deleted successfully"
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message
    })
  }
}
