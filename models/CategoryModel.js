const mongoose = require('mongoose');

const schema = mongoose.Schema;

const categorySchema = new schema({
    type: {type: String, required: true},
    category: {type: String},
    subCategory: {type: String}
})

module.exports = mongoose.model('Category', categorySchema)