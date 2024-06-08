const BudgetServices = require("../services/BudgetServices");
const budgetServices = new BudgetServices();

class BudgetController {
    createBudget = async (request, response) => {
        try {
            const newBudget = await budgetServices.createNewBudget(request);
            response.status(201).json({budget: newBudget.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    }

    getAllBudgetForAMonth = async (request, response) => {
        try {
            const month = request.query.month;
            const getAllBudget = await budgetServices.getAllBudgetForAMonth(month);
            response.status(200).json(getAllBudget);
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    };
}

module.exports = {BudgetController: BudgetController}