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
        if (!year) throw new Error("Year is required");

        const [expenses, plans] = await Promise.all([Expense.find({year}), Investment.find({year}).lean()]);

        if (!expenses.length) return {months: [], yearly: {}};

        const grouped = this.#groupByMonth(expenses);
        const monthsData = this.#applyMonthlyBalances(Object.values(grouped), initialOpeningBalance);

        const planMap = new Map(plans.map(p => [`${p.year}-${p.month}`, {
            percentToInvest: p.investmentPercent,
            amountToInvest: p.amountToInvest != null ? Number(p.amountToInvest) : null
        }]));

        const months = monthsData.map(month => {
            const plan = planMap.get(`${month.year}-${month.month}`);

            if (!plan) {
                const autoAmt = month.investment;
                return this.#addIncomeDist({
                    ...month, investmentPlan: {
                        percentToInvest: 0,
                        amountToInvest: autoAmt,
                        percentInvested: autoAmt > 0 ? 100 : 0,
                        amountLeftToInvest: 0,
                        statusColor: "green"
                    }
                });
            }

            const amountToInvest = Math.round(plan.amountToInvest) ?? Math.round((month.income * plan.percentToInvest) / 100);

            const percentInvested = amountToInvest > 0 ? Math.round((month.investment / amountToInvest) * 100) : 0;
            const investmentLeft = amountToInvest - month.investment;

            return this.#addIncomeDist({
                ...month, investmentPlan: {
                    percentToInvest: plan.percentToInvest,
                    amountToInvest,
                    percentInvested,
                    amountLeftToInvest: investmentLeft,
                    statusColor: this.#getStatusColor(percentInvested)
                }
            });
        });

        const totals = this.#calculateTotals(months);
        const charts = this.#buildCharts(months, totals);

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

    #addIncomeDist(m) {
        const income = m.income || 0;
        const cost = m.expense + m.investment;
        const saving = income - cost;
        const pct = v => income > 0 ? +(v / income * 100).toFixed(1) : 0;
        return {
            ...m, saving, percentages: {
                expense: pct(m.expense), investment: pct(m.investment), saving: pct(saving), total: 100
            }
        };
    }

    #getStatusColor(p) {
        if (p >= 100) return "green";
        if (p >= 50) return "orange";
        return "red";
    }

    #groupByMonth(items) {
        return items.reduce((acc, {month, year, amount, type}) => {
            const key = `${year}-${month}`;
            acc[key] ||= {month, year, expense: 0, income: 0, investment: 0, balance: 0};
            acc[key][type.toLowerCase()] += amount;

            const m = acc[key];
            m.balance = m.income - (m.expense + m.investment);
            return acc;
        }, {});
    }

    #applyMonthlyBalances(rows, opening) {
        let bal = opening;
        return rows.map(m => {
            const closing = bal + m.balance;
            const out = {...m, openingBalance: bal, closingBalance: closing};
            bal = closing;
            return out;
        });
    }

    #calculateTotals(months) {
        const t = months.reduce((acc, m) => {
            acc.income += m.income;
            acc.expense += m.expense;
            acc.investment += m.investment;
            acc.accountBalance += m.balance;
            acc.amountLeftToInvest += m.investmentPlan?.amountLeftToInvest || 0;
            return acc;
        }, {income: 0, expense: 0, investment: 0, accountBalance: 0, amountLeftToInvest: 0});

        const saving = t.income - (t.expense + t.investment);
        const pct = v => t.income > 0 ? +(v / t.income * 100).toFixed(1) : 0;

        t.saving = saving;
        t.percentages = {
            expense: pct(t.expense), investment: pct(t.investment), saving: pct(saving), total: 100
        };

        return t;
    }

    #buildCharts(months, t) {
        return {
            pie: [{label: "Expense", value: t.expense}, {label: "Investment", value: t.investment}, {
                label: "Saving", value: t.saving
            }], bar: {
                months: months.map(m => m.month),
                income: months.map(m => m.income),
                expense: months.map(m => m.expense),
                investment: months.map(m => m.investment)
            }
        };
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
