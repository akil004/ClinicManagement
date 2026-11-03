/**
 * seedPatients.js — inserts realistic sample Patient registrations for
 * development/testing, split between "pending" and "registered" so the
 * Pending Registrations / Registered Patients screens have real data to
 * show immediately.
 *
 * Run standalone with:
 *   node seed/seedPatients.js
 * or as part of the full seed:
 *   npm run seed
 *
 * Idempotent — patients are matched by their unique `email`, so running
 * this multiple times updates existing sample records instead of creating
 * duplicates.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { PATIENT_STATUS } from '../constants/status.js';
import { generatePatientId, generateRegistrationNumber } from '../utils/idHelper.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const dob = (years) => new Date(Date.now() - years * 365.25 * 24 * 60 * 60 * 1000);

const SAMPLE_PATIENTS = [
  { fullName: 'Aarav Sharma', dateOfBirth: dob(34), gender: 'Male', bloodGroup: 'O+', phone: '9876500001', email: 'aarav.sharma@example.com', address: '12 MG Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641001', emergencyContactName: 'Rekha Sharma', emergencyContactPhone: '9876500101', emergencyContactRelationship: 'Spouse', occupation: 'Software Engineer', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Penicillin'], chronicDiseases: ['Hypertension'], pastMedicalHistory: 'Hypertension, controlled with medication.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(30) },
  { fullName: 'Priya Natarajan', dateOfBirth: dob(28), gender: 'Female', bloodGroup: 'A+', phone: '9876500002', email: 'priya.natarajan@example.com', address: '45 Race Course Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641018', emergencyContactName: 'Kumar Natarajan', emergencyContactPhone: '9876500102', emergencyContactRelationship: 'Father', occupation: 'Teacher', maritalStatus: 'Single', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(28) },
  { fullName: 'Mohammed Irfan', dateOfBirth: dob(45), gender: 'Male', bloodGroup: 'B+', phone: '9876500003', email: 'mohammed.irfan@example.com', address: '7 Avinashi Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641037', emergencyContactName: 'Fathima Irfan', emergencyContactPhone: '9876500103', emergencyContactRelationship: 'Spouse', occupation: 'Business Owner', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Sulfa drugs'], chronicDiseases: ['Type 2 Diabetes'], pastMedicalHistory: 'Type 2 diabetes, diagnosed 2019.', currentMedications: ['Metformin 500mg'], status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(25) },
  { fullName: 'Lakshmi Venkatesh', dateOfBirth: dob(52), gender: 'Female', bloodGroup: 'AB+', phone: '9876500004', email: 'lakshmi.venkatesh@example.com', address: '19 DB Road, RS Puram', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641002', emergencyContactName: 'Venkatesh Iyer', emergencyContactPhone: '9876500104', emergencyContactRelationship: 'Spouse', occupation: 'Homemaker', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: [], previousSurgeries: ['Knee replacement (2021)'], pastMedicalHistory: 'Underwent knee replacement surgery in 2021.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(22) },
  { fullName: 'Karthik Raja', dateOfBirth: dob(19), gender: 'Male', bloodGroup: 'O-', phone: '9876500005', email: 'karthik.raja@example.com', address: '3 Trichy Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641005', emergencyContactName: 'Raja Mohan', emergencyContactPhone: '9876500105', emergencyContactRelationship: 'Father', occupation: 'Student', maritalStatus: 'Single', nationality: 'Indian', allergies: ['Peanuts'], chronicDiseases: ['Asthma'], pastMedicalHistory: 'Asthma, uses inhaler as needed.', currentMedications: ['Salbutamol inhaler'], status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(20) },
  { fullName: 'Divya Prakash', dateOfBirth: dob(31), gender: 'Female', bloodGroup: 'B-', phone: '9876500006', email: 'divya.prakash@example.com', address: '88 Sathy Road', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641012', emergencyContactName: 'Prakash Babu', emergencyContactPhone: '9876500106', emergencyContactRelationship: 'Spouse', occupation: 'Accountant', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(18) },
  { fullName: 'Suresh Kumar', dateOfBirth: dob(60), gender: 'Male', bloodGroup: 'A-', phone: '9876500007', email: 'suresh.kumar@example.com', address: '22 Kuniyamuthur', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641008', emergencyContactName: 'Kumari Suresh', emergencyContactPhone: '9876500107', emergencyContactRelationship: 'Spouse', occupation: 'Retired', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Aspirin'], chronicDiseases: ['Coronary Artery Disease'], previousSurgeries: ['Coronary stent placement (2020)'], pastMedicalHistory: 'History of coronary artery disease; stent placed 2020.', currentMedications: ['Clopidogrel', 'Atorvastatin'], status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(15) },
  { fullName: 'Ananya Iyer', dateOfBirth: dob(8), gender: 'Female', bloodGroup: 'O+', phone: '9876500008', email: 'ananya.iyer.guardian@example.com', address: '5 Peelamedu', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641004', emergencyContactName: 'Iyer Ramesh', emergencyContactPhone: '9876500108', emergencyContactRelationship: 'Father', maritalStatus: 'Single', nationality: 'Indian', allergies: ['Eggs'], chronicDiseases: [], pastMedicalHistory: 'Up to date on childhood immunizations.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(12) },
  { fullName: 'Ravi Chandran', dateOfBirth: dob(41), gender: 'Male', bloodGroup: 'AB-', phone: '9876500009', email: 'ravi.chandran@example.com', address: '67 Saibaba Colony', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641011', emergencyContactName: 'Chandran Pillai', emergencyContactPhone: '9876500109', emergencyContactRelationship: 'Brother', occupation: 'Bank Manager', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(10) },
  { fullName: 'Meena Subramaniam', dateOfBirth: dob(37), gender: 'Female', bloodGroup: 'B+', phone: '9876500010', email: 'meena.subramaniam@example.com', address: '14 Gandhipuram', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641006', emergencyContactName: 'Subramaniam Iyer', emergencyContactPhone: '9876500110', emergencyContactRelationship: 'Spouse', occupation: 'Nurse', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Latex'], chronicDiseases: [], pastMedicalHistory: 'Mild seasonal allergies.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(9) },
  { fullName: 'Anitha Raman', dateOfBirth: dob(29), gender: 'Female', bloodGroup: 'A+', phone: '9876500019', email: 'anitha.raman@example.com', address: '10 Race Course', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641018', emergencyContactName: 'Raman Iyer', emergencyContactPhone: '9876500119', emergencyContactRelationship: 'Father', occupation: 'Designer', maritalStatus: 'Single', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(8) },
  { fullName: 'Bala Murugan', dateOfBirth: dob(50), gender: 'Male', bloodGroup: 'O+', phone: '9876500020', email: 'bala.murugan@example.com', address: '25 Ukkadam', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641001', emergencyContactName: 'Murugan Selvi', emergencyContactPhone: '9876500120', emergencyContactRelationship: 'Spouse', occupation: 'Farmer', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: ['Hyperlipidemia'], pastMedicalHistory: 'Hyperlipidemia, on statins.', currentMedications: ['Atorvastatin 10mg'], status: PATIENT_STATUS.REGISTERED, createdAt: daysAgo(7) },

  // ── Pending registrations (awaiting administrator/receptionist approval) ──
  { fullName: 'Vignesh Balaji', dateOfBirth: dob(26), gender: 'Male', bloodGroup: 'O+', phone: '9876500011', email: 'vignesh.balaji@example.com', address: '9 Singanallur', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641005', emergencyContactName: 'Balaji Ramesh', emergencyContactPhone: '9876500111', emergencyContactRelationship: 'Father', occupation: 'Analyst', maritalStatus: 'Single', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(2) },
  { fullName: 'Swathi Rajendran', dateOfBirth: dob(23), gender: 'Female', bloodGroup: 'A+', phone: '9876500012', email: 'swathi.rajendran@example.com', address: '31 Vadavalli', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641041', emergencyContactName: 'Rajendran Kumar', emergencyContactPhone: '9876500112', emergencyContactRelationship: 'Father', occupation: 'Student', maritalStatus: 'Single', nationality: 'Indian', allergies: ['Shellfish'], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(2) },
  { fullName: 'Arjun Menon', dateOfBirth: dob(55), gender: 'Male', bloodGroup: 'B+', phone: '9876500013', email: 'arjun.menon@example.com', address: '2 Ondipudur', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641016', emergencyContactName: 'Menon Latha', emergencyContactPhone: '9876500113', emergencyContactRelationship: 'Spouse', occupation: 'Government Employee', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: ['Migraine'], pastMedicalHistory: 'History of migraines.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(1) },
  { fullName: 'Nithya Ganesan', dateOfBirth: dob(30), gender: 'Female', bloodGroup: 'O-', phone: '9876500014', email: 'nithya.ganesan@example.com', address: '77 Ramanathapuram', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641045', emergencyContactName: 'Ganesan Murthy', emergencyContactPhone: '9876500114', emergencyContactRelationship: 'Spouse', occupation: 'HR Manager', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Ibuprofen'], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(1) },
  { fullName: 'Harish Pillai', dateOfBirth: dob(48), gender: 'Male', bloodGroup: 'AB+', phone: '9876500015', email: 'harish.pillai@example.com', address: '58 Peelamedu', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641004', emergencyContactName: 'Pillai Devi', emergencyContactPhone: '9876500115', emergencyContactRelationship: 'Spouse', occupation: 'Contractor', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: ['Hyperlipidemia'], pastMedicalHistory: 'Hyperlipidemia, on statins.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(1) },
  { fullName: 'Deepika Ramesh', dateOfBirth: dob(21), gender: 'Female', bloodGroup: 'A-', phone: '9876500016', email: 'deepika.ramesh@example.com', address: '15 Race Course', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641018', emergencyContactName: 'Ramesh Kumar', emergencyContactPhone: '9876500116', emergencyContactRelationship: 'Father', occupation: 'Student', maritalStatus: 'Single', nationality: 'Indian', allergies: [], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(0) },
  { fullName: 'Sanjay Gupta', dateOfBirth: dob(39), gender: 'Male', bloodGroup: 'B-', phone: '9876500017', email: 'sanjay.gupta@example.com', address: '40 Town Hall', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641001', emergencyContactName: 'Gupta Anjali', emergencyContactPhone: '9876500117', emergencyContactRelationship: 'Spouse', occupation: 'Shop Owner', maritalStatus: 'Married', nationality: 'Indian', allergies: ['Codeine'], chronicDiseases: [], pastMedicalHistory: 'No significant history.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(0) },
  { fullName: 'Revathi Krishnan', dateOfBirth: dob(63), gender: 'Female', bloodGroup: 'O+', phone: '9876500018', email: 'revathi.krishnan@example.com', address: '6 Race Course', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641018', emergencyContactName: 'Krishnan Iyer', emergencyContactPhone: '9876500118', emergencyContactRelationship: 'Spouse', occupation: 'Retired', maritalStatus: 'Married', nationality: 'Indian', allergies: [], chronicDiseases: ['Osteoarthritis'], pastMedicalHistory: 'Osteoarthritis, managing with physiotherapy.', status: PATIENT_STATUS.PENDING, createdAt: daysAgo(0) },
];

/**
 * seedPatients(adminId) — inserts/updates the sample patients above.
 * Exported so seedAll.js can call it as part of one orchestrated run;
 * also runnable standalone (see `run()` below).
 */
const seedPatients = async (registeredById) => {
  let created = 0;
  let updated = 0;

  for (const sample of SAMPLE_PATIENTS) {
    const { status, createdAt, ...rest } = sample;

    const existing = await Patient.findOne({ email: rest.email });
    if (existing) {
      Object.assign(existing, rest, { registrationStatus: status });
      if (status === PATIENT_STATUS.REGISTERED && !existing.approvedAt) {
        existing.approvedAt = createdAt;
        existing.approvedBy = registeredById;
      }
      await existing.save();
      updated += 1;
      continue;
    }

    const count = await Patient.countDocuments();
    await Patient.create({
      ...rest,
      patientId: generatePatientId(count),
      registrationNumber: generateRegistrationNumber(count),
      registrationStatus: status,
      registrationDate: createdAt,
      registeredBy: registeredById,
      approvedBy: status === PATIENT_STATUS.REGISTERED ? registeredById : undefined,
      approvedAt: status === PATIENT_STATUS.REGISTERED ? createdAt : undefined,
      createdAt,
    });
    created += 1;
  }

  console.log(`✅ Patient seed complete — ${created} created, ${updated} updated (${SAMPLE_PATIENTS.length} total sample patients).`);
  return { created, updated };
};

const run = async () => {
  await connectDB();
  const admin = await User.findOne({ role: 'administrator' }).select('_id').lean();
  await seedPatients(admin?._id);
  await mongoose.connection.close();
  process.exit(0);
};

// Only auto-run when this file is executed directly (`node seed/seedPatients.js`),
// not when imported by seedAll.js.
if (process.argv[1] && process.argv[1].endsWith('seedPatients.js')) {
  run().catch((error) => {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  });
}

export default seedPatients;
