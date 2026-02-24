const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema({
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    weight: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Edge', EdgeSchema);
