const AccountService = require("../services/AccountService");
const accountService = new AccountService();

class AccountController {

    createAccount = async (req, res) => {
        try {
            const account = await accountService.createAccount(req.body);
            res.status(201).json(account);
        } catch (error) {
            res.status(400).json({error: error.message});
        }
    };

    getAllAccounts = async (req, res) => {
        try {
            const accounts = await accountService.getAllAccounts();
            res.status(200).json(accounts);
        } catch (error) {
            res.status(404).json({error: error.message});
        }
    };

    getAccountById = async (req, res) => {
        try {
            const account = await accountService.getAccountById(req.params.id);
            res.status(200).json(account);
        } catch (error) {
            res.status(404).json({error: error.message});
        }
    };

    updateAccount = async (req, res) => {
        try {
            const account = await accountService.updateAccount(req.params.id, req.body);
            res.status(200).json(account);
        } catch (error) {
            res.status(400).json({error: error.message});
        }
    };

    deleteAccount = async (req, res) => {
        try {
            const result = await accountService.deleteAccount(req.params.id);
            res.status(200).json(result);
        } catch (error) {
            res.status(404).json({error: error.message});
        }
    };
}

module.exports = {AccountController};
