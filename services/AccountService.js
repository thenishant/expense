const Account = require("../models/AccountModel");
const {v4: uuidv4} = require("uuid");
const {createAccountSchema, updateAccountSchema} = require("../validation/AccountValidations");

class AccountService {

    generateAccountNumber() {
        return "ACCT-" + uuidv4().slice(0, 8).toUpperCase();
    }

    async createAccount(data) {
        const {error, value} = createAccountSchema.validate(data);
        if (error) throw new Error(error.details[0].message);

        const existing = await Account.findOne({
            accountName: value.accountName, accountType: value.accountType,
        });
        if (existing) throw new Error("Account with same name and type already exists.");

        const accountNumber = this.generateAccountNumber();

        const account = new Account({
            accountNumber,
            accountName: value.accountName,
            accountType: value.accountType,
            initialBalance: value.initialBalance,
            currentBalance: value.initialBalance,
        });

        return account.save();
    }

    async getAllAccounts() {
        const accounts = await Account.find().sort({createdAt: -1});
        if (!accounts.length) throw new Error("No accounts found.");
        const currentBalances = accounts.map(acc => ({
            accountName: acc.accountName, currentBalance: acc.currentBalance
        }));
        const totalBalance = currentBalances.reduce((sum, a) => sum + a.currentBalance, 0);
        return {
            accounts, currentBalances, totalBalance
        };
    }

    async getAccountById(id) {
        const account = await Account.findById(id);
        if (!account) throw new Error("Account not found.");
        return account;
    }

    async updateAccount(id, data) {
        const {error, value} = updateAccountSchema.validate(data);
        if (error) throw new Error(error.details[0].message);

        const account = await Account.findById(id);
        if (!account) throw new Error("Account not found.");

        account.accountName = value.accountName;
        account.accountType = value.accountType;
        account.currentBalance = value.currentBalance;

        return account.save();
    }

    async deleteAccount(id) {
        const account = await Account.findById(id);
        if (!account) throw new Error("Account not found.");

        await Account.findByIdAndDelete(id);
        return {message: "Account deleted successfully."};
    }
}

module.exports = AccountService;
