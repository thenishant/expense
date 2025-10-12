const CategoryModel = require("../models/CategoryModel");

class CategoryService {
    async createCategory({type, category, subCategory}) {
        return CategoryModel.create({type, category, subCategory});
    }

    async getAllCategories() {
        const categories = await CategoryModel.find();

        // Format → Type → Category → [subCategories]
        return categories.reduce((result, item) => {
            const {type, category, subCategory} = item;

            if (!result[type]) result[type] = {};
            if (!result[type][category]) result[type][category] = [];

            if (!result[type][category].includes(subCategory)) {
                result[type][category].push(subCategory);
            }

            return result;
        }, {});
    }

    async getCategoryByName(category) {
        return CategoryModel.findOne({category});
    }

    async findDuplicate({type, category, subCategory}) {
        return CategoryModel.findOne({type, category, subCategory});
    }

    async updateCategory(id, {type, category, subCategory}) {
        const existing = await this.findDuplicate({type, category, subCategory});
        if (existing && existing._id.toString() !== id) {
            throw new Error("This category + subcategory combination already exists.");
        }

        return CategoryModel.findByIdAndUpdate(id, {type, category, subCategory}, {new: true, runValidators: true});
    }

    async deleteCategory(id) {
        return CategoryModel.findByIdAndDelete(id);
    }
}

module.exports = CategoryService;
