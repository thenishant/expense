const ExpenseServices = require("../services/ExpensesServices");

const expenseServices = new ExpenseServices();

class ExpenseController {
    createExpense = async (request, response) => {
        try {
            const newExpense = await expenseServices.createNewExpense(request);
            response.status(201).json({expense: newExpense.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    }

    updateExpense = async (request, response) => {
        try {
            const expenseId = request.headers.id;
            const updatedExpense = await expenseServices.updateExpense(request, expenseId);
            response.status(200).json({expense: updatedExpense.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    }

    deleteExpense = async (request, response) => {
        try {
            const expenseId = request.headers.id;
            const deletedExpense = await expenseServices.deleteExpense(expenseId);
            console.log(deletedExpense)
            response.status(200).json({expense: deletedExpense})
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    }

    findExpenseById = async (request, response) => {
        try {
            const expenseId = request.params.id
            const expenseById = await expenseServices.getExpenseById(expenseId)
            response.status(200).json({expenseById});
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    };

    monthlyExpense = async (request, response) => {
        try {
            const monthly = await expenseServices.getMonthlyExpense()
            response.status(200).json(monthly);
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    };

    getMonthlyTransactions = async (request, response) => {
        try {
            const month = request.query.month;
            const getMonthlyTransactions = await expenseServices.getMonthlyTransactions(month);
            response.status(200).json(getMonthlyTransactions);
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    };

    transactions = async (request, response) => {
        try {
            const month = request.query.month;
            const year = request.query.year;
            const getAllTransactionsForAMonth = await expenseServices.transactions(month, year);
            response.status(200).json(getAllTransactionsForAMonth);
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    };
}


module.exports = {ExpenseController}