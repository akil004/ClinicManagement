/**
 * seedAll.js — runs every seed script in the correct dependency order:
 *   1. Administrator account   (needed as registeredBy/createdBy reference)
 *   2. Specializations
 *   3. Doctors + Receptionists
 *   4. Patients (pending + registered)
 *   5. Appointments + MedicalRecords + Prescriptions + LabReports + Billing
 *
 * Run with:  npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { config } from '../config/env.js';
import User from '../models/User.js';
import seedSpecializations from './seedSpecializations.js';
import seedStaff from './seedStaff.js';
import seedPatients from './seedPatients.js';
import seedClinicalData from './seedClinicalData.js';

const ensureAdmin = async () => {
  const { name: fullName, email, password } = config.admin;
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await User.create({
    fullName, email, password: hashedPassword, role: 'administrator',
    isActive: true, mustChangePassword: false,
  });
  console.log(`✅ Administrator account created: ${email}`);
  return admin;
};

const run = async () => {
  await connectDB();

  const admin = await ensureAdmin();
  await seedSpecializations();
  await seedStaff();
  await seedPatients(admin._id);
  await seedClinicalData();

  console.log('\n🌱 Full seed complete.');
  console.log(`   Administrator login: ${config.admin.email} / (your ADMIN_PASSWORD)`);
  console.log('   Doctor/Receptionist login: see seed/seedStaff.js for emails / Staff@12345 (temp password)');

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('❌ Seed error:', error.message);
  process.exit(1);
});
