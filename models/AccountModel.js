const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
    createdAt: {type: Date, default: Date.now},
    accountType: {type: String, required: true},
    accountName: {type: String, required: true},
    initialBalance: {type: Number, required: true, default: 0},
    currentBalance: {type: Number, required: true, default: 0},
    accountNumber: {type: String, required: true, unique: true},
}, {
    versionKey: false, toJSON: {
        virtuals: true, transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        }
    }, toObject: {
        virtuals: true, transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
        }
    }
});

module.exports = mongoose.model("Account", accountSchema);
