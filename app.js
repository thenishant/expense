const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
const mongoose = require("mongoose");

const budgetRoute = require("./routes/BudgetRoute");
const expenseRoute = require('./routes/ExpensesRoute');
const accountRouter = require("./routes/AccountRoute");
const categoryRoute = require("./routes/CategoryRoute");
const httpError = require('./models/HttpErrorModel');
const investmentRoute = require("./routes/InvestmentRoute");

dotenv.config();

dotenv.config({path: `.env${process.env.NODE_ENV === 'production' ? '.production' : '.development'}`});
const app = express();

app.use(bodyParser.json())
const cors = require("cors");
app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With,Content-Type,Accept,Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE')
    next()
})

app.use('/api/expense', expenseRoute)
app.use('/api/category', categoryRoute)
app.use('/api/budget', budgetRoute)
app.use('/api/account', accountRouter)
app.use('/api/investment', investmentRoute)

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(error.code || 500)
    res.json({message: error.message || 'An unknown error occurred!'});
});

mongoose
    .connect(process.env.URI)
    .then(() => {
        const port = process.env.PORT || 5001;
        app.listen(port)
        console.log(`Server running on port ${port}`)
    })
    .catch(err => {
        console.log(err)
    })

