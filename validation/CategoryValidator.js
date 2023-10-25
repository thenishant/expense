const Joi = require("joi");
const errorFunction = require("../utils/ErrorFunction");

const categoryValidator = Joi.object().keys({
    type: Joi.string().required().valid('expense', 'income'),
    expense: Joi.string().when('type', {is: 'expense', then: Joi.required()}),
    income: Joi.string().when('type', {is: 'income', then: Joi.required()}),
    expenseSubCategory: Joi.string().when('type', {is: 'expense', then: Joi.required()}),
})

const categoryValidation = async (req, res, next) => {
    const payload = {
        type: req.body.type,
        expense: req.body.expense,
        income: req.body.income,
        expenseSubCategory: req.body.expenseSubCategory,
    };

    const {error} = categoryValidator.validate(payload);
    if (error) {
        res.status(406);
        return res.json(
            errorFunction(true, `Error in User Data : ${error.message}`)
        );
    } else {
        next();
    }
};

module.exports = {categoryValidation}