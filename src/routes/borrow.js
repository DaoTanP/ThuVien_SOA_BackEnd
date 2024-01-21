const express = require('express');
const router = express.Router();
const BorrowModel = require('../models/borrow');
const BookModel = require('../models/book');
const { getUserByUsername } = require('../middlewares/user');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);
router.use(getUserByUsername);

router.post('/', async (req, res) => {
    const cardId = req.user.cardId;
    const bookId = req.body.bookId;
    const borrowDate = req.body.borrowDate;
    const returnDate = req.body.returnDate;

    if (!cardId) {
        res.status(404).json({ message: 'Missing library card id' });
        return;
    }

    if (!bookId) {
        res.status(404).json({ message: 'Missing book id' });
        return;
    }

    try {
        const bDate = new Date(borrowDate);
        const rDate = new Date(returnDate);

        if (bDate.getTime() > rDate.getTime()) {
            res.status(400).json({ message: 'Borrow date can not be after return date' });
            return;
        }

        const book = await BookModel.findById(bookId);
        if (!book) {
            res.status(404).json({ message: 'Could not find book with id: ' + bookId });
            return;
        }

        const borrowing = await BorrowModel.findOne({
            cardId: cardId,
            bookId: bookId,
            returnDate: { $gte: bDate }
        });

        if (borrowing) {
            res.status(400).json({ message: 'Must return this book before borrowing again' });
            return;
        }

        const borrowRecord = new BorrowModel({
            cardId: cardId,
            bookId: bookId,
            borrowDate: borrowDate,
            returnDate: returnDate
        });
        const result = await borrowRecord.save();
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/history', async (req, res) => {
    const cardId = req.user.cardId || req.query.cardId;

    if (!cardId) {
        res.status(404).json({ message: 'Missing library card id' });
        return;
    }

    try {
        const result = await BorrowModel.find({ cardId: cardId });
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
module.exports = router;