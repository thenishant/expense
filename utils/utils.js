const {validationResult} = require("express-validator");
const HttpError = require("../models/HttpErrorModel");

function validateRequest(request) {
    const result = validationResult(request);
    if (!result.isEmpty())
        throw new HttpError('Error', 422)
}

module.exports = validateRequest