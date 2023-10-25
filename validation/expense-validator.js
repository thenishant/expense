const {check} = require('express-validator')

const checkValidDate = check('date').notEmpty();
const checkCategoryNotEmpty = check('category').notEmpty();
const checkTypeNotEmpty = check('type').notEmpty();
const checkValidAmount = check('amount').isNumeric().notEmpty();

const checkPostExpenseBody = [checkValidDate, checkCategoryNotEmpty, checkTypeNotEmpty, checkValidAmount]
const checkPatchExpenseBody = checkPostExpenseBody


exports.checkPostExpenseBody = checkPostExpenseBody
exports.checkPatchExpenseBody = checkPatchExpenseBody