const express = require('express');
const Notification = require('../models/Notification');
const Node = require('../models/Node');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/notifications ───────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// ─── POST /api/notifications ──────────────────────────────────────────────
// Creates a new emergency request from a user to a hospital.
router.post('/', async (req, res) => {
    try {
        const { sourceNodeIndex, targetNodeIndex, userName, distance, path } = req.body;

        // Prevent duplicate pending requests
        const exists = await Notification.findOne({
            sourceNodeIndex,
            targetNodeIndex,
            status: 'pending'
        });
        if (exists) return res.status(409).json({ error: 'A notification is already pending' });

        const notif = new Notification({ sourceNodeIndex, targetNodeIndex, userName, distance, path });
        await notif.save();
        res.status(201).json(notif);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// ─── PATCH /api/notifications/:id ─────────────────────────────────────────
// Admin: approve or reject a notification. Requires JWT.
router.patch('/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status))
            return res.status(400).json({ error: 'Status must be approved or rejected' });

        const notif = await Notification.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!notif) return res.status(404).json({ error: 'Notification not found' });

        // If approving, decrement hospital bed count
        if (status === 'approved') {
            const hospital = await Node.findOne({ nodeId: notif.targetNodeIndex, type: 'hospital' });
            if (hospital && hospital.availableBeds > 0) {
                hospital.availableBeds -= 1;
                await hospital.save();
            }
        }

        res.json(notif);
    } catch (err) {
        console.error('[Notification Patch Error]', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// ─── DELETE /api/notifications/:id ────────────────────────────────────────
// Admin only
router.delete('/:id', auth, async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;
