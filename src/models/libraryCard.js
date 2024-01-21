const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    issueDate: {
        type: Date
    },
    expirationDate: {
        type: Date
    },
});

const model = mongoose.model('LibaryCard', cardSchema, 'libraryCards');
module.exports = model;