const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    guestName: String,
    guestEmail: String,
    guestPhone: String,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'Pending' },
    totalAmount: Number,
    orderDetails: Object,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);