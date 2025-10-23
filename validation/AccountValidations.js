const Joi = require("joi");

const createAccountSchema = Joi.object({
    accountName: Joi.string().required(),
    accountType: Joi.string().valid("Savings", "Current", "Business").required(),
    initialBalance: Joi.number().min(0).required(),
});

const updateAccountSchema = Joi.object({
    accountName: Joi.string().required(),
    accountType: Joi.string().valid("Savings", "Current", "Business").required(),
    currentBalance: Joi.number().min(0).required(),
});

module.exports = {createAccountSchema, updateAccountSchema};
