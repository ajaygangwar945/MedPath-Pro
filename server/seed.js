/**
 * MEDPATH PRO - Database Seeder
 * 
 * Usage:
 *   Create admin  : node seed.js <email> <password>
 *   Reset admin   : node seed.js <email> <newpassword> --reset
 * 
 * Examples:
 *   node seed.js admin@medpath.pro MyNewPass@123
 *   node seed.js admin@medpath.pro MyNewPass@123 --reset
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

// ── Parse args ──────────────────────────────────────────────
const [, , email, password, flag] = process.argv;
const forceReset = flag === '--reset';

if (!email || !password) {
    console.log('\n❌  Usage: node seed.js <email> <password> [--reset]\n');
    console.log('   Create : node seed.js admin@medpath.pro MyNewPass@123');
    console.log('   Reset  : node seed.js admin@medpath.pro MyNewPass@123 --reset\n');
    process.exit(1);
}

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await Admin.findOne({ email });

        if (existing && !forceReset) {
            console.log(`\nℹ️  Admin already exists: ${email}`);
            console.log('   To reset the password, add --reset flag:');
            console.log(`   node seed.js ${email} <newpassword> --reset\n`);

        } else {
            if (existing && forceReset) {
                await Admin.deleteOne({ email });
                console.log(`🗑️  Old admin deleted: ${email}`);
            }

            const hashed = await bcrypt.hash(password, 12);
            await Admin.create({ email, password: hashed });

            console.log(`\n🔐 Admin account created!`);
            console.log(`   Email   : ${email}`);
            console.log(`   Password: ${password}`);
            console.log(`\n⚠️  Keep this password safe and do NOT put it back in .env!\n`);
        }
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

seed();
