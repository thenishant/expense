const CategoryService = require("../services/CategoryService");
const categoryService = new CategoryService();

class CategoryController {
    createCategory = async (req, res) => {
        try {
            const {type, category, subCategory} = req.body;

            if (!type || !category || !subCategory) return res.status(400).json({error: "type, category, and subCategory are required."});

            const existing = await categoryService.findDuplicate({type, category, subCategory});
            if (existing) return res.status(400).json({error: "Category + Subcategory already exists."});

            const created = await categoryService.createCategory({type, category, subCategory});
            res.status(201).json({category: created.toObject({getters: true, versionKey: false})});
        } catch (error) {
            console.error("Create Category Error:", error);
            res.status(500).json({error: error.message});
        }
    };

    getAllCategories = async (req, res) => {
        try {
            const categories = await categoryService.getAllCategories();
            res.status(200).json(categories);
        } catch (error) {
            console.error("Get Categories Error:", error);
            res.status(500).json({error: error.message});
        }
    };

    updateCategory = async (req, res) => {
        try {
            const {id} = req.params;
            const {type, category, subCategory} = req.body;

            if (!type || !category || !subCategory) return res.status(400).json({error: "type, category, and subCategory are required."});

            const updated = await categoryService.updateCategory(id, {type, category, subCategory});
            if (!updated) return res.status(404).json({error: "Category not found."});

            res.status(200).json({category: updated.toObject({getters: true, versionKey: false})});
        } catch (error) {
            console.error("Update Category Error:", error);
            if (error.message.includes("already exists")) return res.status(400).json({error: error.message});

            res.status(500).json({error: error.message});
        }
    };

    deleteCategory = async (req, res) => {
        try {
            const {id} = req.params;

            const deleted = await categoryService.deleteCategory(id);
            if (!deleted) return res.status(404).json({error: "Category not found."});

            res.status(200).json({message: "Category deleted successfully."});
        } catch (error) {
            console.error("Delete Category Error:", error);
            res.status(500).json({error: error.message});
        }
    };
}

module.exports = {CategoryController};
