const moment = require("moment");
const Expense = require("../models/ExpenseModel");
const Investment = require('../models/InvestmentModel');
const Account = require('../models/AccountModel');
const {TRANSACTION_TYPES} = require("../constants/constants");

class ExpenseServices {

    async createNewExpense(req) {
        const {
            type, category, subCategory, amount, desc, paymentMode, date: rawDate, fromAccount, toAccount
        } = req.body;

        const date = moment(rawDate).format('YYYY-MM-DD');
        const month = moment(date).format('MMM');
        const year = moment(date).format('YYYY');

        // Remove unnecessary fields for transfer
        const isTransfer = type === TRANSACTION_TYPES.TRANSFER;

        const data = {
            date,
            type,
            amount,
            desc,
            month,
            year,
            fromAccount,
            toAccount,
            ...(type === TRANSACTION_TYPES.EXPENSE ? {category, subCategory, paymentMode} : {}),
            ...(type === TRANSACTION_TYPES.INCOME ? {category, subCategory} : {}),
            ...(type === TRANSACTION_TYPES.INVESTMENT ? {category, subCategory, paymentMode} : {})
        };

        const expense = await Expense.create(data);

        // Balance logic
        if (type === TRANSACTION_TYPES.EXPENSE || type === TRANSACTION_TYPES.INVESTMENT) {
            await this.updateAccountBalance(fromAccount, -amount);
        } else if (type === TRANSACTION_TYPES.INCOME) {
            await this.updateAccountBalance(toAccount, +amount);
        } else if (type === TRANSACTION_TYPES.TRANSFER) {
            await Promise.all([
                this.updateAccountBalance(fromAccount, -amount),
                this.updateAccountBalance(toAccount, +amount)
            ]);
        }

        return expense;
    }


    async updateAccountBalance(accountName, delta) {
        if (!accountName) return;

        const accountDoc = await Account.findOne({accountName});
        if (!accountDoc) return;

        accountDoc.currentBalance = accountDoc.currentBalance + Number(delta);
        await accountDoc.save();
    }

    async deleteExpense(expenseId) {
        const expense = await Expense.findById(expenseId);
        if (!expense) throw new Error(`No expense found for ${expenseId}`);

        const {fromAccount, type, amount} = expense;

        if (fromAccount) {
            const accountDoc = await Account.findOne({accountName: fromAccount});
            if (accountDoc) {
                const amt = Number(amount);

                switch (type) {
                    case TRANSACTION_TYPES.EXPENSE:
                    case TRANSACTION_TYPES.INVESTMENT:
                        accountDoc.currentBalance += amt;
                        break;
                    case TRANSACTION_TYPES.INCOME:
                        accountDoc.currentBalance -= amt;
                        break;
                    default:
                        console.warn(`Unknown expense type: ${type}`);
                        break;
                }
                await accountDoc.save();
            } else {
                console.warn(`No account found for name: ${fromAccount}`);
            }
        }

        await Expense.deleteOne({_id: expenseId});
        return {message: `Expense deleted successfully and balance updated for ${expenseId}`};
    }


    async updateExpense(req, expenseId) {
        const body = req.body;

        // Convert empty strings to null to satisfy required validations
        Object.keys(body).forEach(key => {
            if (body[key] === "") body[key] = null;
        });

        const dateObj = new Date(body.date);
        body.month = dateObj.toLocaleString('default', {month: 'short'});
        body.year = dateObj.getFullYear().toString();

        return Expense.findByIdAndUpdate(expenseId, body, {new: true, runValidators: true});
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
            percentToInvest: plan.investmentPercent,
            suggestedInvestment: Number(Number(plan.suggestedInvestment).toFixed(0))
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
            // if (["expense", "income", "investment"].includes(lowerType)) {
            acc[key][lowerType] += amount;
            // }

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
        const transactions = {Expense: [], Income: [], Investment: [], Transfer: []};
        const totalByPaymentMode = {};

        allTransactions.forEach((transaction) => {
            const {type, paymentMode, amount} = transaction;
            transactions[type].push(transaction);

            if (type === TRANSACTION_TYPES.EXPENSE || type === TRANSACTION_TYPES.INVESTMENT) {
                totalByPaymentMode[paymentMode] = (totalByPaymentMode[paymentMode] || 0) + amount;
            }
        });

        return {transactions, paymentMode: totalByPaymentMode};
    }

    async transactionsCategory(month, year) {
        const transactions = await Expense.find({month, year});
        const expenses = transactions.filter(({type}) => type === TRANSACTION_TYPES.EXPENSE);

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
