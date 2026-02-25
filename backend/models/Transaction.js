const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    receiptID: { type: String, unique: true },
    guestName: String,
    guestEmail: String,
    items: Array, 
    totalPaid: Number,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);