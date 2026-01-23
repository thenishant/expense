const moment = require("moment");
const Expense = require("../models/ExpenseModel");
const Investment = require("../models/InvestmentModel");
const Account = require("../models/AccountModel");
const {TRANSACTION_TYPES} = require("../constants/constants");

class ExpenseServices {

    /* ------------------------------------------------------
       CREATE / UPDATE / DELETE
    ------------------------------------------------------ */

    async createNewExpense(req) {
        const {
            type, category, subCategory, amount, desc, paymentMode, date: rawDate, fromAccount, toAccount
        } = req.body;

        const date = moment(rawDate).format("YYYY-MM-DD");
        const month = moment(date).format("MMM");
        const year = moment(date).format("YYYY");

        const data = {
            date, type, amount, desc, month, year, fromAccount, toAccount, ...(type !== TRANSACTION_TYPES.TRANSFER && {
                category, subCategory
            }), ...(paymentMode && {paymentMode})
        };

        const expense = await Expense.create(data);

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
        const acc = await Account.findOne({accountName});
        if (!acc) return;
        acc.currentBalance += Number(delta);
        await acc.save();
    }

    async deleteExpense(expenseId) {
        const exp = await Expense.findById(expenseId);
        if (!exp) throw new Error("Expense not found");

        const {type, amount, fromAccount} = exp;

        if (fromAccount) {
            const acc = await Account.findOne({accountName: fromAccount});
            if (acc) {
                acc.currentBalance += type === TRANSACTION_TYPES.INCOME ? -amount : amount;
                await acc.save();
            }
        }

        await Expense.deleteOne({_id: expenseId});
        return {message: "Deleted successfully"};
    }

    async updateExpense(req, expenseId) {
        const body = {...req.body};
        Object.keys(body).forEach(k => body[k] === "" && delete body[k]);

        const d = new Date(body.date);
        body.month = d.toLocaleString("default", {month: "short"});
        body.year = d.getFullYear().toString();

        return Expense.findByIdAndUpdate(expenseId, body, {
            new: true, runValidators: true
        });
    }

    async getExpenseById(id) {
        return Expense.findById(id);
    }

    /* ------------------------------------------------------
       SUMMARY API
    ------------------------------------------------------ */

    async summary({year, month}) {
        if (!year) throw new Error("year is required");

        // YEARLY
        if (!month) {
            const openingBalance = 0; // can be fetched from account snapshot
            return this.getMonthlySummary(openingBalance, year);
        }

        // MONTHLY
        const [data] = await Expense.aggregate([{$match: {year, month}}, {
            $facet: {
                transactions: [{$group: {_id: "$type", items: {$push: "$$ROOT"}}}],
                paymentMode: [{
                    $match: {
                        type: {
                            $in: [TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INVESTMENT]
                        }, paymentMode: {$exists: true, $ne: ""}
                    }
                }, {$group: {_id: "$paymentMode", amount: {$sum: "$amount"}}}],
                byFromAccount: [{$match: {fromAccount: {$exists: true, $ne: ""}}}, {
                    $group: {
                        _id: "$fromAccount", amount: {$sum: "$amount"}, count: {$sum: 1}
                    }
                }],
                byCategory: [{$match: {type: TRANSACTION_TYPES.EXPENSE}}, {
                    $group: {
                        _id: "$category", amount: {$sum: "$amount"}
                    }
                }]
            }
        }]);

        const transactions = {
            Expense: [], Income: [], Investment: [], Transfer: []
        };
        data.transactions.forEach(t => transactions[t._id] = t.items);

        const paymentMode = {};
        data.paymentMode.forEach(p => paymentMode[p._id] = p.amount);

        const byFromAccount = {};
        data.byFromAccount.forEach(a => {
            byFromAccount[a._id] = {amount: a.amount, count: a.count};
        });

        const totalCat = data.byCategory.reduce((s, c) => s + c.amount, 0);
        const byCategory = data.byCategory.map(c => ({
            category: c._id, amount: c.amount, percentage: totalCat ? +(c.amount / totalCat * 100).toFixed(1) : 0
        }));

        return {
            scope: "MONTH", year, month, transactions, paymentMode, byFromAccount, byCategory
        };
    }

    async getMonthlySummary(openingBalance, year) {
        const [expenses, plans] = await Promise.all([Expense.find({year}).lean(), Investment.find({year}).lean()]);

        const grouped = this.#groupByMonth(expenses);
        const months = this.#applyBalances(Object.values(grouped), openingBalance);

        const planMap = new Map(plans.map(p => [`${p.year}-${this.#normMonth(p.month)}`, p.investmentPercent]));

        const finalMonths = months.map(m => {
            const pct = planMap.get(`${m.year}-${this.#normMonth(m.month)}`) || 0;
            const toInvest = Math.round((m.income * pct) / 100);
            const invested = m.investment;

            const percentInvested = toInvest ? Math.round((invested / toInvest) * 100) : 0;

            const left = toInvest - invested;

            return this.#addPercentages({
                ...m, investmentPlan: {
                    percentToInvest: pct,
                    amountToInvest: toInvest,
                    percentInvested,
                    amountLeftToInvest: left,
                    percentLeftToInvest: Math.max(100 - percentInvested, 0),
                    statusColor: this.#statusColor(percentInvested)
                }
            });
        });

        const totals = this.#calculateTotals(finalMonths);
        const charts = this.#buildCharts(finalMonths, totals);

        return {
            months: finalMonths, yearly: {
                totals, percentages: totals.percentages, investmentLeftToInvest: totals.amountLeftToInvest, charts
            }
        };
    }

    /* ------------------------------------------------------
       HELPERS
    ------------------------------------------------------ */

    #normMonth(m) {
        return m?.slice(0, 3);
    }

    #groupByMonth(rows) {
        return rows.reduce((acc, {month, year, amount, type}) => {
            acc[month] ||= {month, year, expense: 0, income: 0, investment: 0};
            acc[month][type.toLowerCase()] += amount;
            acc[month].balance = acc[month].income - (acc[month].expense + acc[month].investment);
            return acc;
        }, {});
    }

    #applyBalances(rows, opening) {
        let bal = opening;
        return rows.map(r => {
            const closing = bal + r.balance;
            const out = {...r, openingBalance: bal, closingBalance: closing};
            bal = closing;
            return out;
        });
    }

    #addPercentages(m) {
        const saving = m.income - (m.expense + m.investment);
        const pct = v => m.income ? +(v / m.income * 100).toFixed(1) : 0;

        return {
            ...m, saving, percentages: {
                expense: pct(m.expense), investment: pct(m.investment), saving: pct(saving), total: 100
            }
        };
    }

    #calculateTotals(months) {
        const t = months.reduce((a, m) => {
            a.income += m.income;
            a.expense += m.expense;
            a.investment += m.investment;
            a.amountLeftToInvest += m.investmentPlan.amountLeftToInvest;
            return a;
        }, {income: 0, expense: 0, investment: 0, amountLeftToInvest: 0});

        const saving = t.income - (t.expense + t.investment);
        const pct = v => t.income ? +(v / t.income * 100).toFixed(1) : 0;

        t.saving = saving;
        t.netBalance = saving;
        t.percentages = {
            expense: pct(t.expense), investment: pct(t.investment), saving: pct(saving), total: 100
        };

        return t;
    }

    #buildCharts(months, totals) {
        return {
            pie: [{label: "Expense", value: totals.expense}, {
                label: "Investment", value: totals.investment
            }, {label: "Saving", value: totals.saving}], bar: {
                months: months.map(m => m.month),
                income: months.map(m => m.income),
                expense: months.map(m => m.expense),
                investment: months.map(m => m.investment)
            }
        };
    }

    #statusColor(p) {
        if (p >= 100) return "green";
        if (p >= 50) return "orange";
        return "red";
    }
}

module.exports = ExpenseServices;
