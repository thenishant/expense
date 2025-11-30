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

        const data = {
            date, type, amount, desc, month, year, fromAccount, toAccount, ...(type === TRANSACTION_TYPES.EXPENSE ? {
                category, subCategory, paymentMode
            } : {}), ...(type === TRANSACTION_TYPES.INCOME ? {
                category, subCategory
            } : {}), ...(type === TRANSACTION_TYPES.INVESTMENT ? {category, subCategory, paymentMode} : {})
        };

        const expense = await Expense.create(data);

        // BALANCE LOGIC
        if (type === TRANSACTION_TYPES.EXPENSE || type === TRANSACTION_TYPES.INVESTMENT) {
            await this.updateAccountBalance(fromAccount, -amount);
        } else if (type === TRANSACTION_TYPES.INCOME) {
            await this.updateAccountBalance(toAccount, +amount);
        } else if (type === TRANSACTION_TYPES.TRANSFER) {
            await Promise.all([this.updateAccountBalance(fromAccount, -amount), this.updateAccountBalance(toAccount, +amount)]);
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
                }
                await accountDoc.save();
            }
        }

        await Expense.deleteOne({_id: expenseId});
        return {message: `Expense deleted successfully and balance updated for ${expenseId}`};
    }


    async updateExpense(req, expenseId) {
        const body = req.body;

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
            return {months: [], yearly: {}};
        }

        // GROUP AND CALCULATE
        const grouped = this.#groupByMonth(expenses);
        const monthlySummaries = this.#applyMonthlyBalances(Object.values(grouped), initialOpeningBalance);

        // MAP INVESTMENT PLANS
        const planMap = new Map(investmentPlans.map(plan => [`${plan.year}-${plan.month}`, {
            percentToInvest: plan.investmentPercent, amountToInvest: Number(Number(plan.amountToInvest).toFixed(0))
        }]));

        const months = monthlySummaries.map(month => {
            const key = `${month.year}-${month.month}`;
            const plan = planMap.get(key);

            if (!plan) {
                return this.#addIncomeDistributionFields({
                    ...month, investmentPlan: null
                });
            }

            const percentInvested = plan.amountToInvest ? parseFloat(((month.investment / plan.amountToInvest) * 100).toFixed(0)) : null;

            const investmentLeft = parseFloat((plan.amountToInvest - month.investment).toFixed(0));

            const updated = {
                ...month, investmentPlan: {
                    ...plan, percentInvested, investmentLeft, statusColor: this.#getStatusColor(percentInvested)
                }
            };

            return this.#addIncomeDistributionFields(updated);
        });

        // YEARLY TOTALS
        const totals = this.#calculateOverallBalances(months);

        // YEARLY CHARTS
        const charts = this.#buildYearlyCharts(months, totals);

        // FINAL RESPONSE FORMAT
        return {
            months, yearly: {
                totals: {
                    income: totals.income,
                    expense: totals.expense,
                    investment: totals.investment,
                    saving: totals.saving,
                    netBalance: totals.accountBalance
                }, percentages: totals.percentages, investmentLeftToInvest: totals.amountLeftToInvest, charts
            }
        };
    }


    // --------------------------------------
    // HELPERS
    // --------------------------------------

    #addIncomeDistributionFields(month) {
        const income = month.income || 0;
        const expense = month.expense || 0;
        const investment = month.investment || 0;
        const saving = income - (expense + investment);

        const calc = (v) => income > 0 ? +((v / income) * 100).toFixed(1) : null;

        return {
            ...month, saving, percentages: {
                expense: calc(expense), investment: calc(investment), saving: calc(saving), total: 100
            }
        };
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
                month, year, expense: 0, income: 0, investment: 0, balance: 0
            };

            const lower = type.toLowerCase();
            acc[key][lower] += amount;

            const m = acc[key];
            m.balance = m.income - (m.expense + m.investment);

            return acc;
        }, {});
    }


    #applyMonthlyBalances(data, openingBalance) {
        let balance = openingBalance;

        return data.map(m => {
            const closing = balance + m.balance;
            const res = {
                ...m, openingBalance: balance, closingBalance: closing
            };
            balance = closing;
            return res;
        });
    }


    #calculateOverallBalances(data) {
        const totals = data.reduce((acc, m) => {
            acc.income += m.income;
            acc.expense += m.expense;
            acc.investment += m.investment;
            acc.accountBalance += m.balance;
            acc.amountLeftToInvest += m.investmentPlan?.investmentLeft || 0;
            return acc;
        }, {
            income: 0, expense: 0, investment: 0, accountBalance: 0, amountLeftToInvest: 0
        });

        const saving = totals.income - (totals.expense + totals.investment);

        const calc = v => totals.income > 0 ? +((v / totals.income) * 100).toFixed(1) : null;

        return {
            ...totals, saving, percentages: {
                expense: calc(totals.expense), investment: calc(totals.investment), saving: calc(saving), total: 100
            }
        };
    }


    #buildYearlyCharts(months, totals) {
        const pie = [{label: "Expense", value: totals.expense}, {
            label: "Investment", value: totals.investment
        }, {label: "Saving", value: totals.saving}];

        const bar = {
            months: months.map(m => m.month),
            income: months.map(m => m.income),
            expense: months.map(m => m.expense),
            investment: months.map(m => m.investment)
        };

        return {pie, bar};
    }


    async transactions(month, year) {
        if (!month || !year) throw new Error('month and year are required');

        const allTransactions = await Expense.find({month, year});
        const transactions = {
            Expense: [], Income: [], Investment: [], Transfer: []
        };

        const totalByPaymentMode = {};

        allTransactions.forEach((t) => {
            const {type, paymentMode, amount} = t;
            transactions[type].push(t);

            if (type === TRANSACTION_TYPES.EXPENSE || type === TRANSACTION_TYPES.INVESTMENT) {
                totalByPaymentMode[paymentMode] = (totalByPaymentMode[paymentMode] || 0) + amount;
            }
        });

        return {transactions, paymentMode: totalByPaymentMode};
    }


    async transactionsCategory(month, year) {
        const transactions = await Expense.find({month, year});
        const expenses = transactions.filter(t => t.type === TRANSACTION_TYPES.EXPENSE);

        const grouped = expenses.reduce((acc, {category, amount}) => {
            acc[category] = (acc[category] || 0) + amount;
            return acc;
        }, {});

        const total = Object.values(grouped).reduce((s, a) => s + a, 0);

        return Object.entries(grouped).map(([category, amount]) => ({
            category, amount, percentage: ((amount / total) * 100).toFixed(1)
        }));
    }
}

module.exports = ExpenseServices;
