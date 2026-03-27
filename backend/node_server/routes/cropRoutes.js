const express = require("express");
const router = express.Router();
const {
  createCrop,
  getAllCrops,
  getCropById,
  updateCrop,
  deleteCrop,
} = require("../controllers/cropController");

router.post("/create", createCrop);
router.get("/all", getAllCrops);
router.get("/:cropId", getCropById);
router.put("/:cropId", updateCrop);
router.delete("/:cropId", deleteCrop);

module.exports = router;
