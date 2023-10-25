const {v4: uuidv4} = require('uuid');
const CategoryService = require("../services/CategoryService");

const categoryService = new CategoryService();

class CategoryController {
    createCategory = async (request, response) => {
        try {
            const {category} = request.body;
            const existingCategory = await categoryService.getCategoryByName(category);

            if (existingCategory)
                return response.status(400).json({error: "Category already exists."});

            const createdCategory = await categoryService.createCategory(request);
            response.status(201).json({category: createdCategory.toObject({getters: true, versionKey: false})});
        } catch (error) {
            console.log(error);
            response.status(500).json({error: error.message});
        }
    };

    getAllCategories = async (request, response) => {
        try {
            const createdCategory = await categoryService.getAllCategories();
            response.status(200).json({category: createdCategory})
        } catch (error) {
            console.log(error)
            response.status(500).json({error: error.message});
        }
    };
}

module.exports = {
    CategoryController
}