const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv');
const mongoose = require("mongoose");

const expenseRoute = require('./routes/ExpensesRoute')
const categoryRoute = require("./routes/CategoryRoute");
const budgetRoute = require("./routes/BudgetRoute");
const httpError = require('./models/HttpErrorModel')

dotenv.config();

if (process.env.NODE_ENV === 'production')
    dotenv.config({path: '.env.production'});
else
    dotenv.config({path: '.env.development'});

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

app.use((error, req, res, next) => {
    if (res.headerSent) {
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

