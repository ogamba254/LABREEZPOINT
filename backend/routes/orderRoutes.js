const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Create a new order/booking
router.post('/', async (req, res) => {
    try {
        const receiptID = "LBP-" + Math.floor(100000 + Math.random() * 900000);
        const newOrder = new Transaction({ ...req.body, receiptID });
        await newOrder.save();
        res.status(201).json({ success: true, receiptID, order: newOrder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all orders (for Admin Dashboard)
router.get('/all', async (req, res) => {
    try {
        const orders = await Transaction.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;