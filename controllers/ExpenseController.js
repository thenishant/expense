const ExpenseServices = require("../services/ExpensesServices");

const expenseServices = new ExpenseServices();

class ExpenseController {
    createExpense = async (req, res) => {
        try {
            const newExpense = await expenseServices.createNewExpense(req);
            res.status(201).json({expense: newExpense.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.error(error);
            res.status(500).json({error: error.message});
        }
    }

    updateExpense = async (req, res) => {
        try {
            const expenseId = req.headers.id;
            const updatedExpense = await expenseServices.updateExpense(req, expenseId);
            res.status(200).json({expense: updatedExpense.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }

    deleteExpense = async (req, res) => {
        try {
            const expenseId = req.headers.id;
            const deletedExpense = await expenseServices.deleteExpense(expenseId);
            console.log(deletedExpense)
            res.status(200).json({expense: deletedExpense})
        } catch (error) {
            res.status(500).json({error: error.message});
        }
    }

    async findExpenseById(req, res) {
        try {
            const expenseId = req.params.id
            const expenseById = await expenseServices.getExpenseById(expenseId)
            res.status(200).json({expenseById});
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }

    async monthlyExpense(req, res) {
        try {
            const monthly = await expenseServices.getMonthlyExpense()
            res.status(200).json(monthly);
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }

    async getTotalAmountForAMonth(req, res) {
        try {
            const month = req.query.month;
            const totalExpensesForAMonth = await expenseServices.totalTypeSum(month);
            res.status(200).json(totalExpensesForAMonth);
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }


    async getMonthlyTransactions(req, res) {
        try {
            const month = req.query.month;
            const getMonthlyExpense = await expenseServices.getMonthlyTransactions(month);
            res.status(200).json(getMonthlyExpense);
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }

    async getPaymentModeForExpenseForAMonth(req, res) {
        try {
            const month = req.query.month;
            const getMonthlyExpense = await expenseServices.getPaymentModeForExpenseForAMonth(month);
            res.status(200).json(getMonthlyExpense);
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }

    async getAllTransactionsForAMonth(req, res) {
        try {
            const month = req.query.month;
            const getMonthlyExpense = await expenseServices.getAllTransactionsForAMonth(month);
            res.status(200).json(getMonthlyExpense);
        } catch (error) {
            console.log(error)
            res.status(500).json({error: error.message});
        }
    }
}


module.exports = {
    ExpenseController
}