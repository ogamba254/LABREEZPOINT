const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    type: { 
        type: String, 
        required: true, 
        enum: ['room', 'food'] // Ensures only these two categories are allowed
    },
    price: { 
        type: Number, 
        required: true 
    },
    oldPrice: { 
        type: Number, 
        default: null // This allows the strike-through effect to be optional
    },
    details: { 
        type: String, 
        default: "" 
    },
    photos: { 
        type: [String], // Array of strings for Base64 or URLs
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);