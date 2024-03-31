const moment = require("moment");
const Expense = require("../models/ExpenseModel");

class ExpenseServices {

    async createNewExpense(req) {
        let {expenseDate, type, category, amount, desc, paymentMode} = req.body;
        let date = moment(expenseDate).format('YYYY-MM-DD')
        const month = moment(date).format('MMM');
        const year = moment(date).format('YYYY');
        const data = {
            date, type, category, amount, desc, ...((type === 'Expense' && {paymentMode}) || {}), month, year
        };
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

        return Object.entries(monthlyExpenses).map(([month, data]) => ({
            month: month,
            year: data.year,
            expense: data.expense,
            income: data.income,
            expensePercent: parseFloat((data.expense / data.income * 100).toFixed(1))
        })).reverse();
    }

    async getMonthlyTransactions(month) {
        const allExpenses = await Expense.find({month});

        const expensesByMonth = allExpenses.reduce((expenses, {category, amount, type}) => {
            const categoryType = type === 'Expense' ? 'Expenses' : 'Incomes';
            const categoryObj = expenses[categoryType][category] || {category, amount: 0};
            categoryObj.amount += amount;
            expenses[categoryType][category] = categoryObj;
            expenses['sumOf' + type] += amount;
            return expenses;
        }, {Expenses: {}, Incomes: {}, sumOfExpense: 0, sumOfIncome: 0});

        Object.values(expensesByMonth.Expenses).forEach(expense => {
            expense.percent = parseFloat(((expense.amount / expensesByMonth.sumOfExpense) * 100).toFixed(1));
        });

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
        const findExpense = await Expense.find({month});

        const allIncomes = findExpense.filter(entry => entry.type === "Income");
        const allExpenses = findExpense.filter(entry => entry.type === "Expense");
        let sumOfExpense = 0;
        let sumOfIncome = 0;

        findExpense.forEach((entry) => {
            const {type, amount} = entry;
            type === "Expense" ? sumOfExpense += amount : sumOfIncome += amount;
        });
        const balance = sumOfIncome - sumOfExpense;
        return {sumOfExpense, sumOfIncome, balance, allExpenses: allExpenses, allIncomes: allIncomes}
    }
}

module.exports = ExpenseServices