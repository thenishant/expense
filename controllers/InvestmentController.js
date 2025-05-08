const InvestmentServices = require("../services/InvestmentService");
const investmentServices = new InvestmentServices();

class InvestmentController {
    async createInvestmentPlan(req, res) {
        try {
            const plan = await investmentServices.createNewInvestmentPlan(req.body);
            res.status(200).json(plan);
        } catch (error) {
            console.error(error.stack);
            res.status(400).json({error: error.message});
        }
    }

    async getInvestmentPlans(req, res) {
        try {
            const plans = await investmentServices.getAllInvestmentPlans();
            res.status(200).json(plans);
        } catch (error) {
            console.error(error.stack);
            res.status(500).json({error: error.message});
        }
    }
}

module.exports = {InvestmentController: InvestmentController}
