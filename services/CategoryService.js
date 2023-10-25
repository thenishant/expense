const CategoryModel = require("../models/CategoryModel");

class CategoryService {
    createCategory(request) {
        const {type, category, subCategory} = request.body
        return CategoryModel.create({type, category, subCategory})
    }

    async getAllCategories() {
        const findAllCategories = await CategoryModel.find();
        console.log(findAllCategories)

        return findAllCategories.reduce((result, obj) => {
            const {type, category, subCategory} = obj;
            if (!result[type] && !result[category]) {
                result[type] = [];
            }
            result[type].push({type, category, subCategory});
            return result;
        }, {})
    }

    async getCategoryByName(category) {
        try {
            const findCategory = await CategoryModel.findOne({category})
            return findCategory.category
        } catch (error) {
            console.log(`Error while fetching category by name: ${error.message}`);
        }
    }
}

module.exports = CategoryService