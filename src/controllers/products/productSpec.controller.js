// const { ProductSpec } = require("../../models")

// /**
//  * CREATE / BULK INSERT SPECS
//  */
// exports.createProductSpecs = async (req, res) => {
//   try {
//     const { productId, specs } = req.body

//     const specArray = Object.entries(specs).map(([key, value]) => ({
//       productId,
//       specKey: key,
//       specValue: value
//     }))

//     const createdSpecs = await ProductSpec.bulkCreate(specArray)

//     res.status(201).json({
//       success: true,
//       data: createdSpecs
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// /**
//  * GET SPECS BY PRODUCT ID
//  */
// exports.getSpecsByProductId = async (req, res) => {
//   try {
//     const specs = await ProductSpec.findAll({
//       where: { productId: req.params.productId }
//     })

//     const formatted = {}
//     specs.forEach(s => {
//       formatted[s.specKey] = s.specValue
//     })

//     res.status(200).json({
//       success: true,
//       data: formatted
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// /**
//  * UPDATE SINGLE SPEC
//  */
// exports.updateProductSpec = async (req, res) => {
//   try {
//     const { specKey, specValue } = req.body

//     const spec = await ProductSpec.findOne({
//       where: {
//         productId: req.params.productId,
//         specKey
//       }
//     })

//     if (!spec) {
//       return res.status(404).json({ message: "Spec not found" })
//     }

//     spec.specValue = specValue
//     await spec.save()

//     res.status(200).json({ success: true, data: spec })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

// /**
//  * DELETE SPECS BY PRODUCT
//  */
// exports.deleteSpecsByProductId = async (req, res) => {
//   try {
//     await ProductSpec.destroy({
//       where: { productId: req.params.productId }
//     })

//     res.status(200).json({
//       success: true,
//       message: "Product specs deleted"
//     })
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }



const ProductSpec = require("../../models/products/productSpec.model")

/**
 * CREATE SPECS (Bulk)
 */
exports.createSpecs = async (req, res) => {
  try {
    const { productId, specs } = req.body

    if (!productId || !specs) {
      return res.status(400).json({ message: "productId and specs required" })
    }

    const rows = []

    for (const key in specs) {
      if (Array.isArray(specs[key])) {
        specs[key].forEach(value => {
          rows.push({ productId, specKey: key, specValue: value })
        })
      } else {
        rows.push({ productId, specKey: key, specValue: specs[key] })
      }
    }

    const data = await ProductSpec.bulkCreate(rows)

    res.status(201).json({
      message: "Product specs added",
      data
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * GET SPECS BY PRODUCT
 */
exports.getSpecsByProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const specs = await ProductSpec.findAll({
      where: { productId }
    })

    const formatted = {}

    specs.forEach(s => {
      if (formatted[s.specKey]) {
        if (!Array.isArray(formatted[s.specKey])) {
          formatted[s.specKey] = [formatted[s.specKey]]
        }
        formatted[s.specKey].push(s.specValue)
      } else {
        formatted[s.specKey] = s.specValue
      }
    })

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * UPDATE SINGLE SPEC
 */
exports.updateSpec = async (req, res) => {
  try {
    const { id } = req.params

    const spec = await ProductSpec.findByPk(id)
    if (!spec) return res.status(404).json({ message: "Spec not found" })

    await spec.update(req.body)

    res.json(spec)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * DELETE SPEC
 */
exports.deleteSpec = async (req, res) => {
  try {
    const { id } = req.params

    const spec = await ProductSpec.findByPk(id)
    if (!spec) return res.status(404).json({ message: "Spec not found" })

    await spec.destroy()

    res.json({ message: "Spec deleted" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
