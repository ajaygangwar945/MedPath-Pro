/**
 * MEDPATH PRO - Server Entry Point
 * Node.js + Express + MongoDB backend.
 * Run: node index.js  (after running node seed.js once)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Update FRONTEND_URL if it's localhost but we are on Render
if (process.env.RENDER && process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
    process.env.FRONTEND_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
}

// ─── CORS ─────────────────────────────────────────────────────────────────
// Allow all localhost origins (Vite / Live Server / file://)
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000'
];

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return cb(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            cb(null, true);
        } else {
            cb(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parser ──────────────────────────────────────────────────────────
app.use(express.json());

// ─── Serve frontend static files ─────────────────────────────────────────
// All HTML/CSS/JS is inside server/public/ so Express serves it at "/"
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/nodes', require('./routes/nodes'));
app.use('/api/edges', require('./routes/edges'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Auto-Seed Admin ──────────────────────────────────────────────────────
async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.log('ℹ️ Admin credentials not found in ENV, skipping auto-seed.');
        return;
    }

    try {
        const existing = await Admin.findOne({ email: email.toLowerCase() });
        if (existing) {
            console.log('ℹ️ Admin user already exists, skipping seed.');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await Admin.create({
            email: email.toLowerCase(),
            password: hashedPassword
        });
        console.log(`✅ Admin account created automatically: ${email}`);
    } catch (err) {
        console.error('❌ Failed to auto-seed admin:', err.message);
    }
}

// ─── Database & Server ─────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB connected successfully');
        await seedAdmin();
        app.listen(PORT, () => {
            console.log(`🚀 MedPath Pro server running at http://localhost:${PORT}`);
            console.log(`📋 API docs available at http://localhost:${PORT}/api/health`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('   Make sure MongoDB is running: mongod --dbpath "C:\\data\\db"');
        process.exit(1);
    });
