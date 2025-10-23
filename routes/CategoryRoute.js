const express = require("express");
const {CategoryController} = require("../controllers/CategoryController");

const router = express.Router();
const controller = new CategoryController();

router.post("/create", controller.createCategory);
router.get("/categories", controller.getAllCategories);
router.put("/categories/:id", controller.updateCategory);
router.delete("/categories/:id", controller.deleteCategory);

module.exports = router;
