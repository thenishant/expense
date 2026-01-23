const express = require('express')

const expenseRoute = express.Router()
const {ExpenseController} = require("../controllers/ExpenseController");
const expenseController = new ExpenseController();

expenseRoute.get('/summary', expenseController.monthlySummary)
expenseRoute.patch('/update', expenseController.updateExpense)
expenseRoute.post('/create', expenseController.createExpense)
expenseRoute.get('/:id', expenseController.findExpenseById)
expenseRoute.delete('/:id', expenseController.deleteExpense)

module.exports = expenseRoute