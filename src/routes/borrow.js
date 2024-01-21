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
        const book = await BookModel.findById(bookId);
        if (!book) {
            res.status(404).json({ message: 'Could not find book with id: ' + bookId });
            return;
        }

        const borrowRecord = new BorrowModel({
            cardId: cardId,
            bookId: bookId,
            borrowDate: borrowDate,
            returnDate: returnDate
        });
        const result = await borrowRecord.save();
        res.json(borrowRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;