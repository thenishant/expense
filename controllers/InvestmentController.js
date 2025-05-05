const InvestmentServices = require("../services/InvestmentService");
const investmentServices = new InvestmentServices();

class InvestmentController {
    createInvestmentPlan = async (request, response) => {
        try {
            const newPlan = await investmentServices.createNewInvestmentPlan(request, response);
            response.status(201).json({investment: newPlan.toObject({getters: true, versionKey: false})})
        } catch (error) {
            console.error(error.stack);
            response.status(500).json({error: error.message});
        }
    }
}

module.exports = {InvestmentController: InvestmentController}