const MeasurementMaster = require("../../models/measurements/measurementMaster.model");

/* ---------------- CREATE MEASUREMENT ---------------- */
exports.createMeasurement = async (req, res) => {
  try {
    const { name, unit, isFilterable } = req.body;

    if (!name || !unit) {
      return res.status(400).json({
        success: false,
        message: "Name and unit are required",
      });
    }

    // Normalize
    const normalizedName = name.trim();
    const normalizedUnit = unit.trim();

    // Check duplicate
    const existing = await MeasurementMaster.findOne({
      where: { name: normalizedName },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Measurement already exists",
      });
    }

    const measurement = await MeasurementMaster.create({
      name: normalizedName,
      unit: normalizedUnit,
      isFilterable: isFilterable ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Measurement created successfully",
      data: measurement,
    });
  } catch (error) {
    console.error("CREATE MEASUREMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



/* ---------------- GET ALL MEASUREMENTS ---------------- */
exports.getMeasurements = async (req, res) => {
  try {
    const data = await MeasurementMaster.findAll({
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("GET MEASUREMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- UPDATE MEASUREMENT ---------------- */
exports.updateMeasurement = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, isFilterable } = req.body;

    const measurement = await MeasurementMaster.findByPk(id);

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: "Measurement not found",
      });
    }

    // Prevent duplicate name
    if (name) {
      const existing = await MeasurementMaster.findOne({
        where: { name: name.trim() },
      });

      if (existing && existing.id !== measurement.id) {
        return res.status(400).json({
          success: false,
          message: "Measurement name already exists",
        });
      }
    }

    await measurement.update({
      name: name?.trim() || measurement.name,
      unit: unit?.trim() || measurement.unit,
      isFilterable:
        isFilterable !== undefined
          ? isFilterable
          : measurement.isFilterable,
    });

    return res.json({
      success: true,
      message: "Measurement updated",
      data: measurement,
    });
  } catch (error) {
    console.error("UPDATE MEASUREMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- DELETE MEASUREMENT ---------------- */
exports.deleteMeasurement = async (req, res) => {
  try {
    const { id } = req.params;

    const measurement = await MeasurementMaster.findByPk(id);

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: "Measurement not found",
      });
    }

    await measurement.destroy();

    return res.json({
      success: true,
      message: "Measurement deleted successfully",
    });
  } catch (error) {
    console.error("DELETE MEASUREMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};