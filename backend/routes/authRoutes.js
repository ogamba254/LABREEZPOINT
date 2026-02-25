const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("--- Login Attempt Received ---");

        // Find admin in DB
        const admin = await Admin.findOne({ 
            username: username.trim(), 
            password: password.trim() 
        });

        if (admin) {
            console.log("✅ Match found in DB");
            
            // We must use the exact same logic as server.js
            const secret = process.env.JWT_SECRET || 'fallback';
            
            const token = jwt.sign(
                { id: admin._id }, 
                secret, 
                { expiresIn: '1d' }
            );
            
            return res.json({ success: true, token });
        } else {
            console.log("❌ No match found");
            return res.status(401).json({ success: false, msg: "Invalid Credentials" });
        }
    } catch (err) {
        console.error("CRITICAL BACKEND ERROR:", err.message);
        res.status(500).json({ success: false, msg: "Server Crash: " + err.message });
    }
});

module.exports = router;