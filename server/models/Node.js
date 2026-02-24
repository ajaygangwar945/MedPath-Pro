const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
    nodeId: { type: Number, required: true },        // The graph ID (0, 1, 2...)
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    type: { type: String, enum: ['user', 'hospital'], required: true },
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    availableBeds: { type: Number, default: 0 },
    approved: { type: Boolean, default: false }      // Admin approved flag
}, { timestamps: true });

module.exports = mongoose.model('Node', NodeSchema);
