/**
 * seedAdmin.js — one-time script to create the Administrator account.
 *
 * There is no public sign-up in this system anymore, so the very first
 * Administrator must be seeded directly into the database. Run this once
 * after setting up MongoDB:
 *
 *   node seed/seedAdmin.js
 *
 * Credentials are read from environment variables (with sensible fallbacks
 * for local development). Set these in backend/.env before running:
 *
 *   ADMIN_NAME=Hospital Administrator
 *   ADMIN_EMAIL=admin@hospital.com
 *   ADMIN_PASSWORD=ChangeMe123!
 *
 * The script is idempotent — running it again will update the existing
 * administrator's name/password rather than creating a duplicate.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  const fullName = process.env.ADMIN_NAME ?? 'Hospital Administrator';
  const email    = (process.env.ADMIN_EMAIL ?? 'admin@hospital.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';

  if (password.length < 6) {
    console.error('❌ ADMIN_PASSWORD must be at least 6 characters');
    process.exit(1);
  }

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.fullName = fullName;
    existing.password = hashedPassword;
    existing.role = 'administrator';
    existing.isActive = true;
    existing.mustChangePassword = false;
    await existing.save();
    console.log(`✅ Administrator account updated: ${email}`);
  } else {
    await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'administrator',
      isActive: true,
      mustChangePassword: false,
    });
    console.log(`✅ Administrator account created: ${email}`);
  }

  console.log(`   Login with email "${email}" and the password from ADMIN_PASSWORD.`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('❌ Seed error:', error.message);
  process.exit(1);
});
