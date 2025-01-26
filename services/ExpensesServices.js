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
        const {type, amount, date, paymentMode, desc, category, subCategory} = req.body
        const expense = await Expense.findById(expenseId);
        expense.type = type
        expense.category = category
        expense.subCategory = subCategory
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
        const expenses = await Expense.find();

        // Return early if no expenses are found
        if (!expenses || expenses.length === 0) {
            console.log("No expenses found for the current month and year.");
            return [];
        }

        // Step 1: Aggregate monthly data
        const monthlyData = await this.#aggregateMonthlyData(expenses);

        // Step 2: Sort data by month and year
        const sortedMonthlyData = await this.#sortMonthlyData(monthlyData);

        // Step 3: Add opening and closing balances
        const initialOpeningBalance = 500000; // Latest closing balance
        const updatedMonthlyData = await this.#addOpeningAndClosingBalances(sortedMonthlyData, initialOpeningBalance);

        // Step 4: Calculate overall account balances
        const balances = await this.#calculateBalances(updatedMonthlyData);

        return {data: updatedMonthlyData, ...balances};
    }

    async #aggregateMonthlyData(expenses) {
        return expenses.reduce((acc, {month, year, amount, type}) => {
            if (!month || !year) return acc; // Skip if month or year is missing

            if (!acc[month]) {
                acc[month] = {month, year, expense: 0, income: 0, investment: 0, balance: 0, expensePercent: null};
            }

            acc[month][type.toLowerCase()] += amount;
            acc[month].balance = acc[month].income - (acc[month].expense + acc[month].investment);
            acc[month].expensePercent = acc[month].income > 0 ? parseFloat(((acc[month].expense / acc[month].income) * 100).toFixed(1)) : null;
            return acc;
        }, {});
    }

    async #sortMonthlyData(monthlyData) {
        return Object.values(monthlyData).sort((a, b) => {
            const yearDiff = moment(a.year, 'YYYY').diff(moment(b.year, 'YYYY'));
            if (yearDiff !== 0) return yearDiff;
            return moment(a.month, 'MMM').diff(moment(b.month, 'MMM'));
        });
    }

    async #addOpeningAndClosingBalances(sortedMonthlyData, initialOpeningBalance) {
        let currentOpeningBalance = initialOpeningBalance;

        for (const monthData of sortedMonthlyData) {
            const closingBalance = currentOpeningBalance + monthData.balance;
            monthData.openingBalance = currentOpeningBalance;
            monthData.closingBalance = closingBalance;
            currentOpeningBalance = closingBalance;
        }
        return sortedMonthlyData;
    }

    async #calculateBalances(sortedMonthlyData) {
        const latestClosingBalance = sortedMonthlyData[sortedMonthlyData.length - 1].closingBalance;
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