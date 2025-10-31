const mongoose = require('mongoose');
const {TRANSACTION_TYPES} = require("../constants/constants");

const schema = mongoose.Schema;

const expenseSchema = new schema({
    date: {type: String, required: true},
    type: {
        type: String,
        required: true,
        enum: [TRANSACTION_TYPES.EXPENSE, TRANSACTION_TYPES.INCOME, TRANSACTION_TYPES.TRANSFER, TRANSACTION_TYPES.INVESTMENT]
    },
    category: {type: String, required: true},
    subCategory: {type: String},
    month: {
        type: String,
        required: true,
        enum: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    },
    year: {type: String, required: true},
    amount: {type: Number, required: true},
    desc: {type: String, required: false},
    fromAccount: {type: String, required: true},
    paymentMode: {type: String, enum: ["Credit Card", "Cash", "Bank Account", "UPI Credit Card"],}
})

module.exports = mongoose.model(TRANSACTION_TYPES.EXPENSE, expenseSchema)