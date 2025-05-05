const express = require('express')
const {InvestmentController} = require("../controllers/InvestmentController");
const investmentRoute = express.Router()

const investmentController = new InvestmentController();
investmentRoute.post('/plan', investmentController.createInvestmentPlan)

module.exports = investmentRoute