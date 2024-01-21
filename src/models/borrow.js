const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
    cardId: {
        type: String,
        required: true
    },
    bookId: {
        type: String,
        required: true
    },
    borrowDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        required: true
    },
    status: {
        type: String
    }
});

const model = mongoose.model('BorrowRecord', borrowSchema, 'borrowRecords');
module.exports = model;