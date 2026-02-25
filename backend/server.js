const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const jwt = require('jsonwebtoken'); 
const axios = require('axios'); 
require('dotenv').config();

// Load Models
const Admin = require('./models/Admin');
const Service = require('./models/Service');
const Booking = require('./models/Booking');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- AUTH MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) return res.status(401).json({ message: "No token provided." });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback', (err, user) => {
        if (err) return res.status(403).json({ message: "Auth Error." });
        req.user = user;
        next();
    });
};

// --- ADMIN LOGIN ROUTE ---
app.post('/api/admin-login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (admin && admin.password === password) {
            const token = jwt.sign(
                { id: admin._id, username: admin.username },
                process.env.JWT_SECRET || 'fallback',
                { expiresIn: '24h' }
            );
            res.json({ success: true, token });
        } else {
            res.status(401).json({ message: "Invalid credentials." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MPESA DARAJA LOGIC ---
const getMpesaToken = async () => {
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    try {
        const resp = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` }
        });
        return resp.data.access_token;
    } catch (err) {
        throw new Error("Mpesa Auth Failed");
    }
};

// 1. STK PUSH INITIATION
app.post('/api/mpesa/stkpush', async (req, res) => {
    const { phoneNumber, amount } = req.body;
    try {
        const token = await getMpesaToken();
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const shortCode = process.env.MPESA_SHORTCODE || "174379";
        const password = Buffer.from(shortCode + process.env.MPESA_PASSKEY + timestamp).toString('base64');

        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: Math.round(amount),
                PartyA: phoneNumber, 
                PartyB: shortCode,
                PhoneNumber: phoneNumber,
                CallBackURL: process.env.MPESA_CALLBACK_URL || "https://mydomain.com/callback",
                AccountReference: "LaBreeze",
                TransactionDesc: "Payment"
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        res.json({ success: true, data: stkResponse.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. MPESA STATUS QUERY (The Fix for Redirection)
app.post('/api/mpesa/query', async (req, res) => {
    const { CheckoutRequestID } = req.body;
    try {
        const token = await getMpesaToken();
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const shortCode = process.env.MPESA_SHORTCODE || "174379";
        const password = Buffer.from(shortCode + process.env.MPESA_PASSKEY + timestamp).toString('base64');

        const queryResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: CheckoutRequestID
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Send back the Safaricom data (ResultCode: 0 means success)
        res.json(queryResponse.data);
    } catch (err) {
        // If the transaction is still processing, Safaricom sandbox often returns a 404 or 500.
        // We return a "Wait" status instead of failing so the frontend keeps polling.
        res.json({ ResultCode: "999", ResultDesc: "Still processing" });
    }
});

// --- BOOKING ROUTES ---
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ timestamp: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Booking deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVICE ROUTES ---
app.post('/api/update-service', verifyToken, async (req, res) => {
    const { id, name, price, oldPrice, details, photo, type } = req.body;
    try {
        let service;
        if (id) {
            service = await Service.findByIdAndUpdate(
                id,
                { $set: { name, type, price, oldPrice, details, ...(photo && { photos: [photo] }) } },
                { new: true }
            );
        } else {
            service = new Service({ name, type, price, oldPrice, details, photos: [photo] });
            await service.save();
        }
        res.json({ success: true, data: service });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        res.json(services);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', verifyToken, async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Service deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVE FRONTEND ---
app.use(express.static(path.join(__dirname, '../frontend')));
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// --- START SERVER ---
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("✅ Connected to Labreezpoint Cloud Database");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 LA BREEZE Server running on http://localhost:${PORT}`));
}).catch(err => console.error(err));