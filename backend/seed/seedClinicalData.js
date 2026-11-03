/**
 * seedClinicalData.js — inserts 20+ appointments across every status, plus
 * a MedicalRecord + Prescription (+ occasional LabReport + Billing) for
 * each completed appointment. Every record correctly references the same
 * patient/doctor via ObjectId (e.g. a patient's appointment, medical
 * record, prescription, lab report, and bill all point at that one
 * Patient document).
 *
 * Requires seedStaff() and seedPatients() to have already run (needs real
 * doctor and registered-patient documents to reference). Idempotent at the
 * "run once on an empty collection" level — see the guard in run().
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Prescription from '../models/Prescription.js';
import LabReport from '../models/LabReport.js';
import Billing from '../models/Billing.js';
import { APPOINTMENT_STATUS } from '../constants/appointmentStatus.js';
import { LAB_REPORT_STATUS } from '../constants/labReportStatus.js';
import {
  generateAppointmentId, generateRecordId, generatePrescriptionId,
  generateReportId, generateBillId,
} from '../utils/idHelper.js';
import { calculateBillTotals, derivePaymentStatus } from '../utils/billingHelper.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const pick = (arr, i) => arr[i % arr.length];

const DIAGNOSES = [
  { diagnosis: 'Acute viral fever', treatment: 'Rest, hydration, paracetamol as needed', medicines: [{ medicineName: 'Paracetamol', dosage: '500mg', frequency: 'Twice a day', route: 'Oral', duration: '5 days', quantity: 10, instructions: 'After food' }] },
  { diagnosis: 'Hypertension follow-up', treatment: 'Continue current medication, reduce salt intake', medicines: [{ medicineName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', route: 'Oral', duration: '30 days', quantity: 30, instructions: 'Morning, before food' }] },
  { diagnosis: 'Type 2 Diabetes review', treatment: 'Continue metformin, dietary counselling given', medicines: [{ medicineName: 'Metformin', dosage: '500mg', frequency: 'Twice a day', route: 'Oral', duration: '30 days', quantity: 60, instructions: 'After meals' }] },
  { diagnosis: 'Seasonal allergic rhinitis', treatment: 'Antihistamines, avoid known triggers', medicines: [{ medicineName: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', route: 'Oral', duration: '7 days', quantity: 7, instructions: 'At night' }] },
  { diagnosis: 'Lower back pain', treatment: 'Physiotherapy referral, anti-inflammatory course', medicines: [{ medicineName: 'Ibuprofen', dosage: '400mg', frequency: 'Twice a day', route: 'Oral', duration: '5 days', quantity: 10, instructions: 'After food' }] },
  { diagnosis: 'Routine child wellness check', treatment: 'Immunizations up to date, no concerns', medicines: [] },
];

const APPT_TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];

const seedClinicalData = async () => {
  const alreadySeeded = await Appointment.countDocuments();
  if (alreadySeeded > 0) {
    console.log('ℹ️  Appointments already exist — skipping clinical data seed (idempotent no-op).');
    return;
  }

  const patients = await Patient.find({ registrationStatus: 'registered' }).lean();
  const doctors = await User.find({ role: 'doctor' }).lean();
  const receptionists = await User.find({ role: 'receptionist' }).lean();

  if (patients.length === 0 || doctors.length === 0) {
    console.log('⚠️  No registered patients or doctors found — run seedStaff/seedPatients first. Skipping.');
    return;
  }

  const receptionistId = receptionists[0]?._id;
  const statuses = [
    APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED, APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.CANCELLED,
  ];

  let apptCount = await Appointment.countDocuments();
  let recordCount = await MedicalRecord.countDocuments();
  let rxCount = await Prescription.countDocuments();
  let reportCount = await LabReport.countDocuments();
  let billCount = await Billing.countDocuments();

  let created = 0;
  const TOTAL = 24;

  for (let i = 0; i < TOTAL; i += 1) {
    const patient = pick(patients, i);
    const doctor = pick(doctors, i);
    const status = pick(statuses, i);
    const isPast = status === APPOINTMENT_STATUS.COMPLETED || status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.REJECTED;
    const date = isPast ? daysAgo(TOTAL - i) : daysFromNow((i % 7) + 1);
    const diag = pick(DIAGNOSES, i);

    const appointment = await Appointment.create({
      appointmentId: generateAppointmentId(apptCount++),
      patientId: patient._id,
      patientName: patient.fullName,
      patientAge: patient.age,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      patientBloodGroup: patient.bloodGroup,
      patientGender: patient.gender,
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      receptionistId,
      date,
      timeSlot: pick(APPT_TIME_SLOTS, i),
      complaint: diag.diagnosis,
      status,
      createdBy: receptionistId,
      ...(status === APPOINTMENT_STATUS.APPROVED || status === APPOINTMENT_STATUS.COMPLETED
        ? { approvedBy: doctor._id, approvedAt: daysAgo(TOTAL - i + 1) } : {}),
      ...(status === APPOINTMENT_STATUS.COMPLETED ? { completedAt: date, completedBy: doctor._id } : {}),
      ...(status === APPOINTMENT_STATUS.REJECTED
        ? { rejectionReasonType: 'Specialist unavailable', rejectionReason: 'Doctor unavailable on requested date.', rejectedBy: doctor._id, rejectedAt: date }
        : {}),
      ...(status === APPOINTMENT_STATUS.CANCELLED
        ? { cancellationReason: 'Patient requested cancellation', cancelledBy: receptionistId, cancelledAt: date }
        : {}),
    });
    created += 1;

    // Only completed visits generate a clinical trail (record/prescription/
    // lab report/bill) — matches how a real consultation flow works.
    if (status === APPOINTMENT_STATUS.COMPLETED) {
      const record = await MedicalRecord.create({
        recordId: generateRecordId(recordCount++),
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentId: appointment._id,
        chiefComplaint: diag.diagnosis,
        diagnosis: diag.diagnosis,
        treatmentPlan: diag.treatment,
        doctorNotes: `Patient presented with symptoms consistent with ${diag.diagnosis.toLowerCase()}. Advised follow-up if symptoms persist.`,
        vitals: {
          bloodPressure: '120/80', heartRate: 72 + (i % 10), respiratoryRate: 16,
          temperature: 98.6, oxygenSaturation: 98, weight: 60 + (i % 20), height: 165,
        },
        followUpRequired: i % 3 === 0,
        followUpDate: i % 3 === 0 ? daysFromNow(14) : undefined,
      });

      if (diag.medicines.length > 0) {
        await Prescription.create({
          prescriptionId: generatePrescriptionId(rxCount++),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentId: appointment._id,
          medicalRecordId: record._id,
          prescriptionDate: date,
          diagnosis: diag.diagnosis,
          medicines: diag.medicines,
        });
      }

      // Every third completed visit also gets a lab report.
      if (i % 3 === 1) {
        await LabReport.create({
          reportId: generateReportId(reportCount++),
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentId: appointment._id,
          reportName: 'Complete Blood Count',
          reportType: 'Blood Test',
          testDate: date,
          resultDate: date,
          result: 'Within normal limits',
          unit: '-',
          referenceRange: 'Normal',
          interpretation: 'Normal',
          status: LAB_REPORT_STATUS.REVIEWED,
          reviewedBy: doctor._id,
          reviewedAt: date,
        });
      }

      // Every completed visit gets a bill — totals always computed backend-side.
      const charges = {
        consultationFee: doctor.consultationFee ?? 500,
        laboratoryCharges: i % 3 === 1 ? 350 : 0,
        medicineCharges: diag.medicines.length * 60,
      };
      const unpaidTotals = calculateBillTotals(charges); // amountPaid defaults to 0 → gives us totalAmount
      const amountPaid = i % 4 === 0 ? 0 : unpaidTotals.totalAmount; // every 4th bill left unpaid on purpose
      const finalTotals = calculateBillTotals({ ...charges, amountPaid });

      await Billing.create({
        billId: generateBillId(billCount++),
        patientId: patient._id,
        appointmentId: appointment._id,
        doctorId: doctor._id,
        receptionistId,
        consultationFee: charges.consultationFee,
        laboratoryCharges: charges.laboratoryCharges,
        medicineCharges: charges.medicineCharges,
        totalAmount: finalTotals.totalAmount,
        amountPaid: finalTotals.amountPaid,
        amountDue: finalTotals.amountDue,
        paymentStatus: derivePaymentStatus(finalTotals.totalAmount, finalTotals.amountPaid),
        paymentMethod: finalTotals.amountPaid > 0 ? pick(['cash', 'card', 'UPI'], i) : undefined,
        paymentDate: finalTotals.amountPaid > 0 ? date : undefined,
      });
    }
  }

  console.log(`✅ Clinical data seed complete — ${created} appointments created, with medical records/prescriptions/lab reports/bills for every completed visit.`);
};

const run = async () => {
  await connectDB();
  await seedClinicalData();
  await mongoose.connection.close();
  process.exit(0);
};

if (process.argv[1] && process.argv[1].endsWith('seedClinicalData.js')) {
  run().catch((error) => {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  });
}

export default seedClinicalData;
