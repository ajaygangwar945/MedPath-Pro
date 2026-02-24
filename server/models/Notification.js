const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    sourceNodeIndex: { type: Number, required: true },
    targetNodeIndex: { type: Number, required: true },
    userName: { type: String, required: true },
    distance: { type: Number },
    path: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
