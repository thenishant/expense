const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    month: {type: String, required: true},
    year: {type: String, required: true},
    income: {type: Number, required: true},
    percent: {type: Number, required: true},
    suggestedInvestment: {type: Number, required: true}
});

module.exports = mongoose.model('Investment', investmentSchema);
