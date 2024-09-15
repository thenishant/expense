const moment = require("moment");
const Expense = require("../models/ExpenseModel");

class ExpenseServices {

    async createNewExpense(req) {
        let {type, category, amount, desc, paymentMode} = req.body;
        let date = moment(req.body.date).format('DD-MMM-YYYY');
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
            acc[month] = acc[month] || {month, expense: 0, income: 0, investment: 0, balance: 0};
            acc[month][type.toLowerCase()] += amount;
            acc[month]['balance'] = acc[month].income - (acc[month].expense + acc[month].investment);
            acc[month]['expensePercent'] = parseFloat((acc[month].expense / acc[month].income * 100).toFixed(1));
            return acc;
        }, {});

        return Object.values(monthlyExpenses).map(data => ({
            month: data.month,
            year: data.year,
            expense: data.expense,
            income: data.income,
            investment: data.investment,
            balance: data.balance,
            expensePercent: data.expensePercent
        })).reverse();
    }

    async getMonthlyTransactions(month) {
        const allExpenses = await Expense.find({month});

        const expensesByMonth = allExpenses.reduce((expenses, {category, amount, type}) => {
            let categoryType;
            if (type === 'Expense') {
                categoryType = 'Expenses';
            } else if (type === 'Income') {
                categoryType = 'Incomes';
            } else {
                categoryType = 'Investments';
            }
            const categoryObj = expenses[categoryType][category] || {category, amount: 0};
            categoryObj.amount += amount;
            expenses[categoryType][category] = categoryObj;
            expenses['sumOf' + type] += amount;

            return expenses;
        }, {Expenses: {}, Incomes: {}, Investments: {}, sumOfExpense: 0, sumOfIncome: 0, sumOfInvestment: 0});

        Object.values(expensesByMonth.Expenses).forEach(expense => {
            expense.percent = parseFloat(((expense.amount / expensesByMonth.sumOfExpense) * 100).toFixed(1));
        });

        Object.values(expensesByMonth.Investments).forEach(investment => {
            investment.percent = parseFloat(((investment.amount / expensesByMonth.sumOfInvestment) * 100).toFixed(1));
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

    async getAllTransactionsForAMonth(month, year) {
        const allTransactions = await Expense.find({month, year});

        const expenses = allTransactions.filter(transaction => transaction.type === "Expense");
        const incomes = allTransactions.filter(transaction => transaction.type === "Income");
        const investments = allTransactions.filter(transaction => transaction.type === "Investment");

        const totalExpenses = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);
        const totalIncomes = incomes.reduce((sum, transaction) => sum + transaction.amount, 0);
        const totalInvestments = investments.reduce((sum, transaction) => sum + transaction.amount, 0);

        const balance = totalIncomes - totalExpenses - totalInvestments;

        return {
            totalExpenses, totalIncomes, totalInvestments, balance, expenses, incomes, investments
        };
    }
}

module.exports = ExpenseServices