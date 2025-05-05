const moment = require("moment");
const Expense = require("../models/ExpenseModel");

class ExpenseServices {

    async createNewExpense(req) {
        let {type, category, subCategory, amount, desc, paymentMode} = req.body;
        let date = moment(req.body.date).format('YYYY-MM-DD');
        const month = moment(date).format('MMM');
        const year = moment(date).format('YYYY');
        const data = {
            date, type, category, subCategory, amount, desc, ...(type === 'Expense' ? {paymentMode} : {}), month, year
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
        const {type, amount, date, paymentMode, desc, category, subCategory} = req.body;
        const expense = await Expense.findById(expenseId);
        const dateObj = new Date(date);
        const month = dateObj.toLocaleString('default', {month: 'short'});
        const year = dateObj.getFullYear().toString();

        Object.assign(expense, {
            type, category, subCategory, amount, desc, date, paymentMode, month, year
        });

        return await expense.save();
    }

    async getExpenseById(expenseId) {
        return Expense.findById(expenseId);
    }

    async getMonthlySummary(initialOpeningBalance = 0) {
        const expenses = await Expense.find();
        if (!expenses?.length) return [];

        const grouped = this.#groupByMonth(expenses);
        const sorted = this.#sortByDate(grouped);
        const withBalances = this.#applyMonthlyBalances(sorted, initialOpeningBalance);
        const totals = this.#calculateOverallBalances(withBalances);

        return {data: withBalances, ...totals};
    }

    #groupByMonth(expenses) {
        return expenses.reduce((acc, {month, year, amount, type}) => {
            if (!month || !year) return acc;
            const key = `${year}-${month}`;

            acc[key] ??= {month, year, expense: 0, income: 0, investment: 0, balance: 0, expensePercent: null};

            const current = acc[key];
            const lowerType = type.toLowerCase();

            if (["expense", "income", "investment"].includes(lowerType)) {
                current[lowerType] += amount;
            }

            current.balance = current.income - (current.expense + current.investment);
            current.expensePercent = current.income > 0 ? parseFloat(((current.expense / current.income) * 100).toFixed(1)) : null;

            return acc;
        }, {});
    }

    #sortByDate(data) {
        return Object.values(data).sort((a, b) => {
            const dateA = new Date(`${a.year}-${a.month}-01`);
            const dateB = new Date(`${b.year}-${b.month}-01`);
            return dateA - dateB;
        });
    }

    #applyMonthlyBalances(data, openingBalance) {
        let balance = openingBalance;

        return data.map(month => {
            const closing = balance + month.balance;
            const result = {
                ...month, openingBalance: balance, closingBalance: closing
            };
            balance = closing;
            return result;
        });
    }

    #calculateOverallBalances(data) {
        const accountBalance = data.reduce((sum, m) => sum + m.balance, 0);
        const mobileAccountBalance = data.at(-1)?.closingBalance || 0;
        const effectiveBalance = accountBalance + mobileAccountBalance;

        return {accountBalance, mobileAccountBalance, effectiveBalance};
    }

    async transactions(month, year) {
        if (!month || !year) {
            throw new Error('month and year are required');
        }

        const allTransactions = await Expense.find({month, year});
        const transactions = {Expense: [], Income: [], Investment: []};
        const totalByPaymentMode = {};

        allTransactions.forEach((transaction) => {
            const {type, paymentMode, amount} = transaction;
            transactions[type].push(transaction);

            if (type === 'Expense' || type === 'Investment') {
                totalByPaymentMode[paymentMode] = (totalByPaymentMode[paymentMode] || 0) + amount;
            }
        });

        return {transactions, paymentMode: totalByPaymentMode};
    }

    async transactionsCategory(month, year) {
        const transactions = await Expense.find({month, year});
        const expenses = transactions.filter(({type}) => type === 'Expense');

        const groupedExpenses = expenses.reduce((acc, {category, amount}) => {
            acc[category] = (acc[category] || 0) + amount;
            return acc;
        }, {});

        const totalExpense = Object.values(groupedExpenses).reduce((sum, amount) => sum + amount, 0);

        return Object.entries(groupedExpenses).map(([category, amount]) => ({
            category, amount, percentage: `${((amount / totalExpense) * 100).toFixed(1)}%`
        }));
    }

}

module.exports = ExpenseServices;