const moment = require("moment");
const Expense = require("../models/ExpenseModel");
const Investment = require('../models/InvestmentModel');

class ExpenseServices {

    async createNewExpense(req) {
        const {type, category, subCategory, amount, desc, paymentMode, date: rawDate} = req.body;
        const date = moment(rawDate).format('YYYY-MM-DD');
        const month = moment(date).format('MMM');
        const year = moment(date).format('YYYY');

        const data = {
            date, type, category, subCategory, amount, desc, ...(type === 'Expense' ? {paymentMode} : {}), month, year
        };

        return Expense.create(data);
    }

    async deleteExpense(expenseId) {
        const expense = await Expense.findById(expenseId);
        if (!expense) throw new Error(`No expense found for ${expenseId}`);
        await expense.remove();
        return {message: `Expense deleted successfully for ${expenseId}`};
    }

    async updateExpense(req, expenseId) {
        const {type, amount, date, paymentMode, desc, category, subCategory} = req.body;
        const dateObj = new Date(date);
        const month = dateObj.toLocaleString('default', {month: 'short'});
        const year = dateObj.getFullYear().toString();

        const expense = await Expense.findById(expenseId);
        Object.assign(expense, {
            type, category, subCategory, amount, desc, date, paymentMode, month, year
        });

        return expense.save();
    }

    async getExpenseById(expenseId) {
        return Expense.findById(expenseId);
    }

    async getMonthlySummary(initialOpeningBalance, year) {
        if (!year) throw new Error('Year is required');

        const [expenses, investmentPlans] = await Promise.all([Expense.find({year}), Investment.find({year}).lean()]);

        if (!expenses?.length) {
            return {
                months: [], accountBalance: 0, mobileAccountBalance: 0, effectiveBalance: 0
            };
        }

        const groupedExpenses = this.#groupByMonth(expenses);
        const monthlySummaries = this.#applyMonthlyBalances(Object.values(groupedExpenses), initialOpeningBalance);

        const planMap = new Map(investmentPlans.map(plan => [`${plan.year}-${plan.month}`, {
            percentToInvest: plan.investmentPercent, suggestedInvestment: Number(Number(plan.suggestedInvestment).toFixed(0))
        }]));

        const months = monthlySummaries.map(month => {
            const key = `${month.year}-${month.month}`;
            const plan = planMap.get(key);

            if (!plan) return {...month, investmentPlan: null};

            const percentInvested = plan.suggestedInvestment ? parseFloat(((month.investment / plan.suggestedInvestment) * 100).toFixed(0)) : null;

            const investmentLeft = parseFloat((plan.suggestedInvestment - month.investment).toFixed(0));

            return {
                ...month, investmentPlan: {
                    ...plan, percentInvested, investmentLeft, statusColor: this.#getStatusColor(percentInvested)
                }
            };
        });

        const totals = this.#calculateOverallBalances(months);
        return {months, ...totals};
    }

    #getStatusColor(percent) {
        if (percent == null) return 'red';
        if (percent >= 100) return 'green';
        if (percent >= 50) return 'orange';
        return 'red';
    }

    #groupByMonth(expenses) {
        return expenses.reduce((acc, {month, year, amount, type}) => {
            if (!month || !year) return acc;

            const key = `${year}-${month}`;
            acc[key] ??= {
                month, year, expense: 0, income: 0, investment: 0, balance: 0, expensePercent: null
            };

            const lowerType = type.toLowerCase();
            if (["expense", "income", "investment"].includes(lowerType)) {
                acc[key][lowerType] += amount;
            }

            const current = acc[key];
            current.balance = current.income - (current.expense + current.investment);
            current.expensePercent = current.income > 0 ? parseFloat(((current.expense / current.income) * 100).toFixed(1)) : null;

            return acc;
        }, {});
    }

    #applyMonthlyBalances(data, openingBalance) {
        let balance = openingBalance;

        return data.map(month => {
            const closing = balance + month.balance;
            const result = {...month, openingBalance: balance, closingBalance: closing};
            balance = closing;
            return result;
        });
    }

    #calculateOverallBalances(data) {
        return data.reduce((acc, m) => {
            acc.income += m.income;
            acc.expense += m.expense;
            acc.investment += m.investment;
            acc.accountBalance += m.balance;
            acc.mobileAccountBalance = m.closingBalance;
            acc.effectiveBalance = acc.accountBalance + acc.mobileAccountBalance;
            acc.amountLeftToInvest += m.investmentPlan?.investmentLeft || 0;
            return acc;
        }, {
            income: 0,
            expense: 0,
            investment: 0,
            accountBalance: 0,
            mobileAccountBalance: 0,
            effectiveBalance: 0,
            amountLeftToInvest: 0
        });
    }

    async transactions(month, year) {
        if (!month || !year) throw new Error('month and year are required');

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
            category, amount, percentage: `${((amount / totalExpense) * 100).toFixed(1)}`
        }));
    }
}

module.exports = ExpenseServices;
