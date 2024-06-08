const moment = require("moment");
const Budget = require("../models/BudgetModel");
const Expense = require("../models/ExpenseModel");

class BudgetServices {

    async createNewBudget(req) {
        let {category, amount} = req.body;
        const month = moment().format('MMM');
        const year = moment().format('YYYY');
        const data = {
            category, amount, month, year
        };
        return Budget.create(data);
    }

    async getAllBudgetForAMonth(month) {
        return Budget.find({month});
    }
}

module.exports = BudgetServices