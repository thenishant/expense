const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    type: {type: String, required: true},
    category: {type: String, required: true},
    subCategory: {type: String, required: true},
});

module.exports = mongoose.model("Category", categorySchema);
