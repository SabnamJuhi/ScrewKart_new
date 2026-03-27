// exports.getStoreProducts = async (req, res) => {
//   try {
//     const { storeId } = req.params;

//     const products = await Product.findAll({
//       where: { storeId, isActive: true },
//       include: ["variants"],
//     });

//     res.json({
//       success: true,
//       count: products.length,
//       products,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



exports.getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) throw new Error("storeId required");

    const products = await Product.findAll({
      where: {
        storeId,
        isActive: true,
      },
      include: ["variants"],
    });

    res.json({
      success: true,
      products,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};