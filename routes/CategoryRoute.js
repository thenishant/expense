const express = require('express')

const categoryRoute = express.Router()
const {categoryValidation} = require("../validation/CategoryValidator");
const {CategoryController} = require("../controllers/CategoryController");

const categoryController = new CategoryController();
categoryRoute.post('/new', categoryController.createCategory)
categoryRoute.get('/getAllCategories', categoryController.getAllCategories)

module.exports = categoryRoute