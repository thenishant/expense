const Investment = require('../models/InvestmentModel');
const ExpenseServices = require("./ExpensesServices");
const expenseServices = new ExpenseServices();

class InvestmentServices {
    async createNewInvestmentPlan(reqBody) {
        const {month, year, percent} = reqBody;

        if (!month || !year || percent == null) {
            throw new Error("month, year, and percent are required");
        }

        const summary = await expenseServices.getMonthlySummary(500000);
        const dataForMonth = summary.data.find(entry => entry.month === month && entry.year === year);

        if (!dataForMonth || dataForMonth.income === 0) {
            throw new Error("Income not found for selected month");
        }

        const investmentSuggestion = parseFloat(((percent / 100) * dataForMonth.income).toFixed(2));

        return Investment.findOneAndUpdate({month, year}, {
            percent, suggestedInvestment: investmentSuggestion, income: dataForMonth.income, investmentPercent: percent
        }, {new: true, upsert: true});
    }

    async getAllInvestmentPlans() {
        const monthOrder = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };

        const plans = await Investment.find().lean();
        if (!plans.length) return [];

        plans.sort((a, b) => {
            const yearDiff = parseInt(b.year) - parseInt(a.year);
            if (yearDiff !== 0) return yearDiff;
            return monthOrder[b.month] - monthOrder[a.month];
        });

        return plans;
    }
}

module.exports = InvestmentServices;
