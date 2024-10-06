const moment = require("moment");
const Expense = require("../models/ExpenseModel");

class ExpenseServices {

    async createNewExpense(req) {
        let {type, category, amount, desc, paymentMode} = req.body;
        let date = moment(req.body.date).format('DD-MMM-YYYY');
        const month = moment(date).format('MMM');
        const year = moment(date).format('YYYY');
        const data = {
            date,
            type,
            category,
            amount,
            desc, ...(((type === 'Expense' || type === 'Investment') && {paymentMode}) || {}),
            month,
            year
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

    async summary() {
        const moment = require('moment');
        const expenses = await Expense.find();

        if (!expenses || expenses.length === 0) {
            console.log("No expenses found for the current month and year.");
            return [];
        }

        // Aggregate data by month and year
        const monthlyData = expenses.reduce((acc, {month, year, amount, type}) => {
            if (!month || !year) return acc;  // Skip if month or year is missing

            if (!acc[month]) {
                acc[month] = {month, year, expense: 0, income: 0, investment: 0};
            }

            acc[month][type.toLowerCase()] += amount;

            acc[month].balance = acc[month].income - (acc[month].expense + acc[month].investment);
            acc[month].expensePercent = acc[month].income > 0 ? parseFloat(((acc[month].expense / acc[month].income) * 100).toFixed(1)) : null;

            return acc;
        }, {});


        // Convert aggregated data to an array and sort it by month and year
        const sortedMonthlyData = Object.values(monthlyData)
            .sort((a, b) => {
                const yearDiff = moment(a.year, 'YYYY').diff(moment(b.year, 'YYYY'));
                if (yearDiff !== 0) return yearDiff;
                return moment(a.month, 'MMM').diff(moment(b.month, 'MMM'));
            });

        // Return the sorted data (last 12 months, reversed)
        return sortedMonthlyData.slice(-12).reverse();
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

        const expenses = transactions.filter((transaction) => transaction.type === 'Expense' && transaction.month === month && transaction.year === year);

        const groupedExpenses = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const totalExpense = Object.values(groupedExpenses).reduce((total, amount) => total + amount, 0);

        return Object.entries(groupedExpenses).map(([category, amount]) => {
            let percentage = `${((amount / totalExpense) * 100).toFixed(1)}%`;
            return ({
                category: category, amount: amount, percentage: percentage
            });
        });
    }

}

module.exports = ExpenseServices