/**
 * seedStaff.js — inserts 5 sample doctors and 3 sample receptionists.
 *
 * Doctor/receptionist profile fields (specialization, department,
 * experience, etc.) live directly on the User document in this project
 * (role-specific fields are optional and simply unused for other roles) —
 * see the architecture note in README/hand-off doc for why a full
 * User → Doctor/Receptionist collection split was not undertaken.
 *
 * Idempotent — matched by unique `email`.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const SAMPLE_DOCTORS = [
  {
    fullName: 'Dr. Anand Krishnan', email: 'anand.krishnan@hospital.com', phone: '9876511001',
    department: 'Cardiology', specialization: 'Cardiologist', qualification: 'MD, DM Cardiology',
    experience: 15, consultationFee: 800, availabilityStatus: 'Available',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableTimeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'],
  },
  {
    fullName: 'Dr. Sneha Reddy', email: 'sneha.reddy@hospital.com', phone: '9876511002',
    department: 'General Medicine', specialization: 'General Physician', qualification: 'MBBS, MD',
    experience: 8, consultationFee: 500, availabilityStatus: 'Available',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    availableTimeSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '16:00', '16:30'],
  },
  {
    fullName: 'Dr. Vivek Nair', email: 'vivek.nair@hospital.com', phone: '9876511003',
    department: 'Orthopedics', specialization: 'Orthopedic', qualification: 'MS Orthopedics',
    experience: 12, consultationFee: 700, availabilityStatus: 'Busy',
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    availableTimeSlots: ['10:00', '10:30', '11:00', '15:00', '15:30'],
  },
  {
    fullName: 'Dr. Kavitha Suresh', email: 'kavitha.suresh@hospital.com', phone: '9876511004',
    department: 'Pediatrics', specialization: 'Pediatrician', qualification: 'MD Pediatrics',
    experience: 10, consultationFee: 600, availabilityStatus: 'Available',
    availableDays: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
    availableTimeSlots: ['09:00', '09:30', '10:00', '13:00', '13:30', '14:00'],
  },
  {
    fullName: 'Dr. Rajesh Pillai', email: 'rajesh.pillai@hospital.com', phone: '9876511005',
    department: 'Dermatology', specialization: 'Dermatologist', qualification: 'MD Dermatology',
    experience: 6, consultationFee: 550, availabilityStatus: 'On Leave',
    availableDays: ['Tuesday', 'Wednesday', 'Thursday'],
    availableTimeSlots: ['11:00', '11:30', '12:00'],
  },
];

const SAMPLE_RECEPTIONISTS = [
  { fullName: 'Meera Balakrishnan', email: 'meera.b@hospital.com', phone: '9876522001', department: 'Front Desk' },
  { fullName: 'Sanjay Verma',       email: 'sanjay.v@hospital.com', phone: '9876522002', department: 'Front Desk' },
  { fullName: 'Priyanka Das',       email: 'priyanka.d@hospital.com', phone: '9876522003', department: 'Billing Desk' },
];

const DEFAULT_STAFF_PASSWORD = 'Staff@12345';

/** upsertStaffUser(data, role, hashedPassword) — idempotent by email. */
const upsertStaffUser = async (data, role, hashedPassword) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    Object.assign(existing, data, { role, isActive: true });
    await existing.save();
    return { created: false };
  }
  await User.create({ ...data, role, password: hashedPassword, isActive: true, mustChangePassword: true });
  return { created: true };
};

/**
 * seedStaff() — inserts/updates the sample doctors and receptionists.
 * Exported for seedAll.js; also runnable standalone.
 */
const seedStaff = async () => {
  const hashedPassword = await bcrypt.hash(DEFAULT_STAFF_PASSWORD, 10);

  let doctorsCreated = 0;
  for (const doctor of SAMPLE_DOCTORS) {
    const { created } = await upsertStaffUser(doctor, 'doctor', hashedPassword);
    if (created) doctorsCreated += 1;
  }

  let receptionistsCreated = 0;
  for (const receptionist of SAMPLE_RECEPTIONISTS) {
    const { created } = await upsertStaffUser(receptionist, 'receptionist', hashedPassword);
    if (created) receptionistsCreated += 1;
  }

  console.log(`✅ Staff seed complete — ${doctorsCreated} doctors created, ${receptionistsCreated} receptionists created.`);
  console.log(`   All seeded staff share the temporary password: ${DEFAULT_STAFF_PASSWORD} (must change on first login).`);

  return {
    doctors: await User.find({ role: 'doctor', email: { $in: SAMPLE_DOCTORS.map((d) => d.email) } }).lean(),
    receptionists: await User.find({ role: 'receptionist', email: { $in: SAMPLE_RECEPTIONISTS.map((r) => r.email) } }).lean(),
  };
};

const run = async () => {
  await connectDB();
  await seedStaff();
  await mongoose.connection.close();
  process.exit(0);
};

if (process.argv[1] && process.argv[1].endsWith('seedStaff.js')) {
  run().catch((error) => {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  });
}

export default seedStaff;
