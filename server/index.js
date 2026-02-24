/**
 * MEDPATH PRO - Server Entry Point
 * Node.js + Express + MongoDB backend.
 * Run: node index.js  (after running node seed.js once)
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────────────
// Allow all localhost origins (Vite / Live Server / file://)
app.use(cors({
    origin: (origin, cb) => cb(null, true),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parser ──────────────────────────────────────────────────────────
app.use(express.json());

// ─── Serve frontend static files ─────────────────────────────────────────
// All HTML/CSS/JS is inside server/public/ so Express serves it at "/"
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/nodes', require('./routes/nodes'));
app.use('/api/edges', require('./routes/edges'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── MongoDB Connection ────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('\n✅ MongoDB connected:', process.env.MONGO_URI);
        app.listen(PORT, () => {
            console.log(`🚀 MedPath Pro server running at http://localhost:${PORT}`);
            console.log(`📋 API docs available at http://localhost:${PORT}/api/health\n`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('   Make sure MongoDB is running: mongod --dbpath "C:\\data\\db"');
        process.exit(1);
    });
