const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// We check if the model already exists to prevent "OverwriteModelError"
module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);