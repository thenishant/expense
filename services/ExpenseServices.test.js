const ExpenseServices = require('./ExpensesServices');
const Expense = require('../models/ExpenseModel');

jest.mock('../models/ExpenseModel');

describe('ExpenseServices', () => {
    let expenseServices;

    beforeAll(() => {
        expenseServices = new ExpenseServices();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('should create a new expense', async () => {
        const mockRequest = {
            body: {
                date: '01/01/2023',
                type: 'Expense',
                category: 'Food',
                amount: 50,
                desc: 'Lunch',
                paymentMode: 'Credit Card',
                month: 'Jan'
            },
        };

        Expense.create.mockResolvedValueOnce({});

        await expect(expenseServices.createNewExpense(mockRequest)).resolves.toEqual({});
        expect(Expense.create).toHaveBeenCalledWith({
            date: '01/01/2023',
            type: 'Expense',
            category: 'Food',
            amount: 50,
            desc: 'Lunch',
            paymentMode: 'Credit Card',
            month: 'Jan',
        });
    });


    it('should throw an error when deleting a non-existent expense', async () => {
        Expense.findById.mockResolvedValueOnce(null);

        await expect(expenseServices.deleteExpense('nonexistentId')).rejects.toThrowError(
            'No expense found for nonexistentId'
        );
        expect(Expense.findById).toHaveBeenCalledWith('nonexistentId');
    });
});
