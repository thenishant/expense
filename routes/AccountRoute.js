const express = require("express");
const {AccountController} = require("../controllers/AccountController");
const router = express.Router();
const accountController = new AccountController();

router.post("/create", accountController.createAccount);
router.get("/accounts", accountController.getAllAccounts);
router.get("/:id", accountController.getAccountById);
router.put("/:id", accountController.updateAccount);
router.delete("/:id", accountController.deleteAccount);

module.exports = router;
