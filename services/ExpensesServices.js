const moment = require("moment");
const Expense = require("../models/ExpenseModel");

class ExpenseServices {

    async createNewExpense(req) {
        const {date, type, category, amount, desc, paymentMode} = req.body;
        const month = moment(date).format('MMM');
        const data = {date, type, category, amount, desc, ...((type === 'Expense' && {paymentMode}) || {}), month};
        return Expense.create(data);
    }

    async deleteExpense(expenseId) {
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            throw new Error(`No expense found for ${expenseId}`);
        }
        await expense.remove();
        return {message: `Expense deleted successfully for ${expenseId}`};
    }

    async updateExpense(req, expenseId) {
        const {type, amount, date, paymentMode, desc, category} = req.body
        const expense = await Expense.findById(expenseId);
        expense.type = type
        expense.category = category
        expense.amount = amount
        expense.desc = desc
        expense.date = date
        expense.paymentMode = paymentMode
        return await expense.save()
    }

    async getExpenseById(expenseId) {
        return Expense.findById(expenseId)
    }

    async getMonthlyExpense() {
        const expenses = await Expense.find();

        const monthlyExpenses = expenses.reduce((acc, {month, amount, type}) => {
            acc[month] = acc[month] || {month, expense: 0, income: 0};
            acc[month][type === 'Expense' ? 'expense' : 'income'] += amount;
            acc[month]['expensePercent'] = parseFloat((acc[month].expense / acc[month].income * 100).toFixed(1))
            return acc;
        }, {});
        return this.#monthsInOrder(monthlyExpenses);
    }

    #monthsInOrder(monthlyExpenses) {
        return Object.values(monthlyExpenses).sort((a, b) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months.indexOf(a.month) - months.indexOf(b.month);
        });
    }

    async getMonthlyTransactions(month) {
        const allExpenses = await Expense.find({month});

        const expensesByMonth = allExpenses.reduce((expenses, {category, amount, type}) => {
            if (type === 'Expense' || type === 'Income') {
                const expenseType = type === 'Expense' ? 'Expenses' : 'Incomes';
                expenses[expenseType][category] = expenses[expenseType][category] || {
                    category,
                    amount: 0
                };
                expenses[expenseType][category].amount += amount;
                expenses[type === 'Expense' ? 'sumOfExpense' : 'sumOfIncome'] += amount;
            }
            return expenses;
        }, {Expenses: {}, Incomes: {}, sumOfExpense: 0, sumOfIncome: 0});

        expensesByMonth.Expenses = Object.values(expensesByMonth.Expenses);
        expensesByMonth.Incomes = Object.values(expensesByMonth.Incomes);

        return {[month]: expensesByMonth};
    }

    async getPaymentModeForExpenseForAMonth(month) {
        const allExpenses = await Expense.find({month});
        const totalByPaymentMode = {};

        allExpenses.forEach(({type, paymentMode, amount}) => {
            if (type === 'Expense') {
                if (totalByPaymentMode[paymentMode]) {
                    totalByPaymentMode[paymentMode] += amount;
                } else {
                    totalByPaymentMode[paymentMode] = amount;
                }
            }
        });

        return Object.keys(totalByPaymentMode).map(paymentMode => ({
            name: paymentMode, amount: totalByPaymentMode[paymentMode]
        }));
    }

    async getAllTransactionsForAMonth(month) {
        const allExpenses = await Expense.find({month});
        let sumOfExpense = 0;
        let sumOfIncome = 0;

        allExpenses.forEach((entry) => {
            const {type, amount} = entry;
            if (type === "Expense") {
                sumOfExpense += amount;
            } else if (type === "Income") {
                sumOfIncome += amount;
            }
        });
        const balance = sumOfIncome - sumOfExpense;
        return {sumOfExpense, sumOfIncome, balance, allExpenses}
    }
}

module.exports = ExpenseServices