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
    category: {
        type: String, required: function () {
            return this.type !== TRANSACTION_TYPES.TRANSFER;
        }
    },
    subCategory: {
        type: String, required: function () {
            return this.type !== TRANSACTION_TYPES.TRANSFER;
        }
    },
    month: {
        type: String,
        required: true,
        enum: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    },
    year: {type: String, required: true},
    amount: {type: Number, required: true},
    desc: {type: String},
    fromAccount: {
        type: String, required: function () {
            return this.type !== TRANSACTION_TYPES.TRANSFER;
        }
    },
    toAccount: {type: String},
    paymentMode: {
        type: String, required: function () {
            return this.type === TRANSACTION_TYPES.EXPENSE || this.type === TRANSACTION_TYPES.INVESTMENT;
        }
    }
});

module.exports = mongoose.model(TRANSACTION_TYPES.EXPENSE, expenseSchema);
