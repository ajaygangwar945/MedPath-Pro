const express = require('express');
const Edge = require('../models/Edge');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/edges ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const edges = await Edge.find();
        res.json(edges);
    } catch {
        res.status(500).json({ error: 'Failed to fetch edges' });
    }
});

// ─── POST /api/edges ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { from, to, weight } = req.body;
        // Prevent duplicate edges
        const exists = await Edge.findOne({
            $or: [{ from, to }, { from: to, to: from }]
        });
        if (exists) return res.status(409).json({ error: 'Edge already exists' });

        const edge = new Edge({ from, to, weight });
        await edge.save();
        res.status(201).json(edge);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create edge' });
    }
});

// ─── DELETE /api/edges/:id ────────────────────────────────────────────────
// Admin protected
router.delete('/:id', auth, async (req, res) => {
    try {
        await Edge.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to delete edge' });
    }
});

module.exports = router;
