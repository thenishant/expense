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

    async summary() {
        const expenses = await Expense.find();
        if (!expenses || expenses.length === 0) {
            return [];
        }

        const monthlyData = this.#aggregateMonthlyData(expenses);
        const sortedMonthlyData = this.#sortMonthlyData(monthlyData);
        const updatedMonthlyData = this.#addOpeningAndClosingBalances(sortedMonthlyData, 500000);
        const balances = this.#calculateBalances(updatedMonthlyData);

        return {data: updatedMonthlyData, ...balances};
    }

    #aggregateMonthlyData(expenses) {
        return expenses.reduce((acc, {month, year, amount, type}) => {
            if (!month || !year) return acc;

            const key = `${year}-${month}`;
            if (!acc[key]) {
                acc[key] = {
                    month, year, expense: 0, income: 0, investment: 0, balance: 0, expensePercent: null,
                };
            }

            const item = acc[key];
            item[type.toLowerCase()] += amount;
            item.balance = item.income - (item.expense + item.investment);
            item.expensePercent = item.income > 0 ? parseFloat(((item.expense / item.income) * 100).toFixed(1)) : null;

            return acc;
        }, {});
    }

    #sortMonthlyData(monthlyData) {
        return Object.values(monthlyData).sort((a, b) => {
            const dateA = new Date(`${a.year}-${a.month}-01`);
            const dateB = new Date(`${b.year}-${b.month}-01`);
            return dateA - dateB;
        });
    }

    #addOpeningAndClosingBalances(sortedMonthlyData, initialOpeningBalance) {
        let currentOpeningBalance = initialOpeningBalance;

        for (const monthData of sortedMonthlyData) {
            const closingBalance = currentOpeningBalance + monthData.balance;
            monthData.openingBalance = currentOpeningBalance;
            monthData.closingBalance = closingBalance;
            currentOpeningBalance = closingBalance;
        }

        return sortedMonthlyData;
    }

    #calculateBalances(sortedMonthlyData) {
        const latestClosingBalance = sortedMonthlyData.at(-1)?.closingBalance || 0;
        const accountBalance = sortedMonthlyData.reduce((total, {balance}) => total + balance, 0);
        const mobileAccountBalance = latestClosingBalance;
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