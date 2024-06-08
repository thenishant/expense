const express = require('express')
const {BudgetController} = require("../controllers/BudgetController");
const budgetRoute = express.Router()

const budgetController = new BudgetController();
budgetRoute.post('/create', budgetController.createBudget)
budgetRoute.get('/allBudget', budgetController.getAllBudgetForAMonth)

module.exports = budgetRoute