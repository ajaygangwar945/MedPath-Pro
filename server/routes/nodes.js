const express = require('express');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/nodes ───────────────────────────────────────────────────────
// Returns all nodes sorted by nodeId. No auth required (public visualizer).
router.get('/', async (req, res) => {
    try {
        const nodes = await Node.find().sort({ nodeId: 1 });
        res.json(nodes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch nodes' });
    }
});

// ─── POST /api/nodes ──────────────────────────────────────────────────────
// Creates a new node. No auth needed (anyone can add to visualizer).
router.post('/', async (req, res) => {
    try {
        const { nodeId, x, y, type, name, phone, email, availableBeds } = req.body;
        const node = new Node({ nodeId, x, y, type, name, phone, email, availableBeds });
        await node.save();
        res.status(201).json(node);
    } catch (err) {
        console.error('[Create Node Error]', err);
        res.status(500).json({ error: 'Failed to create node' });
    }
});

// ─── PATCH /api/nodes/:id ─────────────────────────────────────────────────
// Updates node fields (name, phone, email, beds). No auth needed.
router.patch('/:id', async (req, res) => {
    try {
        const node = await Node.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!node) return res.status(404).json({ error: 'Node not found' });
        res.json(node);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update node' });
    }
});

// ─── PATCH /api/nodes/:id/approve ────────────────────────────────────────
// Admin: mark a node as approved. Requires JWT.
router.patch('/:id/approve', auth, async (req, res) => {
    try {
        const node = await Node.findByIdAndUpdate(
            req.params.id,
            { approved: req.body.approved },
            { new: true }
        );
        if (!node) return res.status(404).json({ error: 'Node not found' });
        res.json(node);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update approval status' });
    }
});

// ─── DELETE /api/nodes/:id ────────────────────────────────────────────────
// Admin: delete a node + its edges + its notifications. Requires JWT.
router.delete('/:id', auth, async (req, res) => {
    try {
        const node = await Node.findById(req.params.id);
        if (!node) return res.status(404).json({ error: 'Node not found' });

        const nodeId = node.nodeId;

        // Remove the node
        await Node.findByIdAndDelete(req.params.id);

        // Remove all edges touching this node
        await Edge.deleteMany({ $or: [{ from: nodeId }, { to: nodeId }] });

        // Remove all notifications involving this node
        await Notification.deleteMany({
            $or: [{ sourceNodeIndex: nodeId }, { targetNodeIndex: nodeId }]
        });

        res.json({ success: true, deletedNodeId: nodeId });
    } catch (err) {
        console.error('[Delete Node Error]', err);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

// ─── DELETE /api/nodes (clear all) ────────────────────────────────────────
// Admin: wipe all nodes. Requires JWT.
router.delete('/', auth, async (req, res) => {
    try {
        await Node.deleteMany({});
        await Edge.deleteMany({});
        await Notification.deleteMany({});
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

module.exports = router;
