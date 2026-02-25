const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // This looks for the MONGO_URI you just set up in your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`🚀 MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;