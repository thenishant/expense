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

        const currentMonth = moment();
        const fifteenMonthsAgo = currentMonth.clone().subtract(1, 'months');

        const monthlyData = expenses.reduce((acc, {month, category, amount, type}) => {
            const monthMoment = moment(month, 'MMM');
            if (monthMoment.isBefore(fifteenMonthsAgo)) return acc;

            const monthData = acc[month] || this.initializeMonthData(month);
            monthData[type.toLowerCase()] += amount;

            this.updateCategory(monthData.categories, category, amount, type);

            monthData.balance = this.calculateBalance(monthData);
            monthData.expensePercent = this.calculateExpensePercent(monthData);

            acc[month] = monthData;
            return acc;
        }, {});

        this.calculateCategoryPercentages(monthlyData);
        const sortedMonthlyData = Object.values(monthlyData).sort((a, b) => moment(a.month, 'MMM').diff(moment(b.month, 'MMM')));

        return sortedMonthlyData.slice(-15).reverse();
    }

    initializeMonthData(month) {
        return {
            month,
            expense: 0,
            income: 0,
            investment: 0,
            balance: 0,
            expensePercent: null,
            categories: {Expenses: {}, Incomes: {}, Investments: {}}
        };
    }

    updateCategory(categories, category, amount, type) {
        let categoryType;
        if (type === 'Expense') {
            categoryType = 'Expenses';
        } else if (type === 'Income') {
            categoryType = 'Incomes';
        } else {
            categoryType = 'Investments';
        }

        const categoryObj = categories[categoryType][category] || {category, amount: 0};
        categoryObj.amount += amount;
        categories[categoryType][category] = categoryObj;
    }

    calculateBalance(monthData) {
        return monthData.income - (monthData.expense + monthData.investment);
    }

    calculateExpensePercent(monthData) {
        if (monthData.income > 0) {
            return parseFloat(((monthData.expense / monthData.income) * 100).toFixed(1));
        }
        return null;
    }

    calculateCategoryPercentages(monthlyData) {
        Object.values(monthlyData).forEach(monthData => {
            const sumOfExpense = Object.values(monthData.categories.Expenses).reduce((sum, expense) => sum + expense.amount, 0);
            const sumOfInvestment = Object.values(monthData.categories.Investments).reduce((sum, investment) => sum + investment.amount, 0);

            Object.values(monthData.categories.Expenses).forEach(expense => {
                expense.percent = sumOfExpense > 0 ? parseFloat(((expense.amount / sumOfExpense) * 100).toFixed(1)) : null;
            });

            Object.values(monthData.categories.Investments).forEach(investment => {
                investment.percent = sumOfInvestment > 0 ? parseFloat(((investment.amount / sumOfInvestment) * 100).toFixed(1)) : null;
            });
        });
    }

    async transactions(month, year) {
        const allTransactions = await Expense.find({month, year});

        const transactionsByType = allTransactions.reduce((acc, transaction) => {
            acc[transaction.type].push(transaction);
            return acc;
        }, {Expense: [], Income: [], Investment: []});

        const totals = Object.keys(transactionsByType).reduce((acc, type) => {
            acc[type] = transactionsByType[type].reduce((sum, transaction) => sum + transaction.amount, 0);
            return acc;
        }, {});

        const balance = totals.Income - totals.Expense - totals.Investment;

        const totalByPaymentMode = {};

        transactionsByType.Expense.forEach(({paymentMode, amount}) => {
            totalByPaymentMode[paymentMode] = (totalByPaymentMode[paymentMode] || 0) + amount;
        });

        transactionsByType.Investment.forEach(({paymentMode, amount}) => {
            totalByPaymentMode[paymentMode] = (totalByPaymentMode[paymentMode] || 0) + amount;
        });

        return {
            ...totals, balance, transactionsByType, expenseByPaymentMode: totalByPaymentMode,
        };
    }
}

module.exports = ExpenseServices