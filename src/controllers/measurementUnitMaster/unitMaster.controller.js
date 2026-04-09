const UnitMaster = require("../../models/measurements/UnitMaster.model");

/* ---------------- CREATE UNIT ---------------- */
exports.createUnit = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const existing = await UnitMaster.findOne({
      where: { name: normalizedName },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Unit already exists",
      });
    }

    const unit = await UnitMaster.create({
      name: normalizedName,
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    console.error("CREATE UNIT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- GET ALL UNITS ---------------- */
exports.getUnits = async (req, res) => {
  try {
    const data = await UnitMaster.findAll({
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET UNITS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- UPDATE UNIT ---------------- */
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const unit = await UnitMaster.findByPk(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const existing = await UnitMaster.findOne({
      where: { name: normalizedName },
    });

    if (existing && existing.id !== unit.id) {
      return res.status(400).json({
        success: false,
        message: "Unit already exists",
      });
    }

    await unit.update({ name: normalizedName });

    return res.json({
      success: true,
      message: "Unit updated",
      data: unit,
    });
  } catch (error) {
    console.error("UPDATE UNIT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- DELETE UNIT ---------------- */
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await UnitMaster.findByPk(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    await unit.destroy();

    return res.json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    console.error("DELETE UNIT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};