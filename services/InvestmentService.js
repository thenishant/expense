const Investment = require('../models/InvestmentModel');
const ExpenseServices = require("./ExpensesServices");
const {EXPENSES} = require("../constants/constants");
const expenseServices = new ExpenseServices();

class InvestmentServices {
    async createNewInvestmentPlan(reqBody) {
        const {month, year, percent} = reqBody;

        if (!month || !year || percent == null) {
            throw new Error("month, year, and percent are required");
        }

        const summary = await expenseServices.getMonthlySummary(EXPENSES.BALANCE, year);
        const dataForMonth = summary.data.find(entry => entry.month === month && entry.year === year);

        if (!dataForMonth || dataForMonth.income === 0) {
            throw new Error("Income not found for selected month");
        }

        const investmentSuggestion = parseFloat(((percent / 100) * dataForMonth.income).toFixed(2));

        return Investment.findOneAndUpdate({month, year}, {
            percent, suggestedInvestment: investmentSuggestion, income: dataForMonth.income, investmentPercent: percent
        }, {new: true, upsert: true});
    }
}

module.exports = InvestmentServices;
