const mongoose = require('mongoose');

const schema = mongoose.Schema;

const expenseSchema = new schema({
    date: {type: String, required: true},
    type: {type: String, required: true, enum: ["Expense", "Income"],},
    category: {type: String, required: true},
    month: {type: String, required: true},
    year: {type: String, required: true},
    amount: {type: Number, required: true},
    desc: {type: String, required: true},
    paymentMode: {type: String, enum: ["Credit Card", "Cash", "Bank Account"],}
})

module.exports = mongoose.model('Expense', expenseSchema)