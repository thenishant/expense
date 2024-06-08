const mongoose = require('mongoose');

const schema = mongoose.Schema;

const budgetSchema = new schema({
    category: {type: String, required: true},
    month: {type: String, required: true},
    year: {type: String, required: true},
    amount: {type: Number, required: true},
})

module.exports = mongoose.model('Budget', budgetSchema)