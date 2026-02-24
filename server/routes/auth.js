const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');

const router = express.Router();

// ─── Nodemailer transporter ────────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// ─── POST /api/auth/login ──────────────────────────────────────────────────
// Validates email + password, returns JWT on success.
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required' });

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (!admin)
            return res.status(401).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, admin.password);
        if (!match)
            return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign(
            { adminId: admin._id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ success: true, token, email: admin.email });
    } catch (err) {
        console.error('[Login Error]', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────
// Generates a reset token and sends the reset link via email.
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
        // Always respond with success to avoid email enumeration
        if (!admin) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        admin.resetToken = token;
        admin.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await admin.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"MedPath Pro" <${process.env.EMAIL_USER}>`,
            to: admin.email,
            subject: 'MedPath Pro - Admin Password Reset',
            html: `
                <div style="font-family:Inter,sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <h1 style="color:#14b8a6;margin:0;">MedPath Pro</h1>
                        <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Hospital Path Visualizer</p>
                    </div>
                    <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
                        <h2 style="color:#0f172a;margin-top:0;">Password Reset Request</h2>
                        <p style="color:#64748b;">We received a request to reset your admin password. Click the button below to set a new password.</p>
                        <a href="${resetUrl}" style="display:inline-block;background:#14b8a6;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin:16px 0;">
                            Reset Password
                        </a>
                        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                    </div>
                </div>
            `
        });

        res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('[Forgot Password Error]', err);
        res.status(500).json({ error: 'Failed to send reset email. Check server email configuration.' });
    }
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────
// Validates the token and updates the admin password.
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res.status(400).json({ error: 'Token and new password are required' });

        const admin = await Admin.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!admin)
            return res.status(400).json({ error: 'Invalid or expired reset token' });

        admin.password = await bcrypt.hash(newPassword, 12);
        admin.resetToken = null;
        admin.resetTokenExpiry = null;
        await admin.save();

        res.json({ success: true, message: 'Password reset successfully!' });
    } catch (err) {
        console.error('[Reset Password Error]', err);
        res.status(500).json({ error: 'Server error during password reset' });
    }
});

// ─── GET /api/auth/verify ─────────────────────────────────────────────────
// Quick check — frontend can call this to validate a stored JWT.
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ valid: false });

    try {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true });
    } catch {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;
