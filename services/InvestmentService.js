const Investment = require('../models/InvestmentModel');
const ExpenseServices = require("./ExpensesServices");
const expenseServices = new ExpenseServices();

class InvestmentServices {
    async createNewInvestmentPlan(req, res) {
        const {month, year, percent} = req.body;

        if (!month || !year || percent == null) {
            return res.status(400).json({error: "month, year, and percent are required"});
        }

        const summary = await expenseServices.getMonthlySummary(500000);
        const dataForMonth = summary.data.find(entry => entry.month === month && entry.year === year);

        if (!dataForMonth || dataForMonth.income === 0) {
            return res.status(404).json({error: "Income not found for selected month"});
        }

        const investmentSuggestion = parseFloat(((percent / 100) * dataForMonth.income).toFixed(2));

        const updatedInvestment = await Investment.findOneAndUpdate({month, year}, // Query to find the existing record
            {
                percent, suggestedInvestment: investmentSuggestion, income: dataForMonth.income,
            }, {
                new: true, upsert: true,
            });

        return Investment.create(updatedInvestment);
    }
}

module.exports = InvestmentServices;
