import mongoose from 'mongoose';
import { PATIENT_STATUS_VALUES, PATIENT_STATUS } from '../constants/status.js';
import { calculateAge } from '../utils/ageHelper.js';

/**
 * Patient — the hospital *registration* record. Deliberately a separate
 * collection/model from Appointment: registering a patient never creates
 * an appointment, and booking an appointment always references an
 * existing, already-*registered* Patient document via Appointment.patientId.
 */
const patientSchema = new mongoose.Schema(
  {
    // ── Identification ───────────────────────────────────
    patientId:          { type: String, required: true, unique: true, trim: true }, // e.g. "PAT-000123"
    registrationNumber: { type: String, required: true, unique: true, trim: true }, // e.g. "REG-000123"
    fullName:    { type: String, required: [true, 'Full name is required'], trim: true },
    firstName:   { type: String, trim: true },
    middleName:  { type: String, trim: true },
    lastName:    { type: String, trim: true },
    dateOfBirth: { type: Date },
    // Cached copy of the age computed from dateOfBirth at write time — kept
    // for fast list/search rendering. dateOfBirth remains the source of
    // truth (see utils/ageHelper.js); this field is recalculated on every
    // save via the pre-save hook below whenever dateOfBirth is present.
    age:         { type: Number, min: 0 },
    gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
    bloodGroup:  { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },

    // ── Contact ──────────────────────────────────────────
    phone:          { type: String, required: [true, 'Phone number is required'], trim: true },
    alternatePhone: { type: String, trim: true },
    email:          { type: String, trim: true, lowercase: true },
    address:        { type: String, trim: true },
    city:           { type: String, trim: true },
    state:          { type: String, trim: true },
    postalCode:     { type: String, trim: true },

    // ── Emergency contact ────────────────────────────────
    emergencyContactName:         { type: String, trim: true },
    emergencyContactRelationship: { type: String, trim: true },
    emergencyContactPhone:        { type: String, trim: true },

    // ── Personal information ─────────────────────────────
    occupation:    { type: String, trim: true },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'] },
    nationality:   { type: String, trim: true },

    // ── Medical information ──────────────────────────────
    allergies:              [{ type: String, trim: true }],
    chronicDiseases:        [{ type: String, trim: true }],
    previousSurgeries:      [{ type: String, trim: true }],
    currentMedications:     [{ type: String, trim: true }],
    familyMedicalHistory:   { type: String, trim: true },
    pastMedicalHistory:     { type: String, trim: true },
    disabilityInformation:  { type: String, trim: true },

    // ── Registration lifecycle ───────────────────────────
    registrationStatus: {
      type: String,
      enum: PATIENT_STATUS_VALUES,
      default: PATIENT_STATUS.PENDING,
    },
    registrationDate: { type: Date, default: Date.now },
    registeredBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    // Rejection audit trail — the registration record is kept (not deleted)
    // when rejected, so there is always a full audit history.
    rejectionReason: { type: String, trim: true },
    rejectedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:       { type: Date },

    // ── System ────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Keep the cached `age` field in sync with dateOfBirth on every save.
patientSchema.pre('save', function syncAge(next) {
  if (this.dateOfBirth) {
    const computed = calculateAge(this.dateOfBirth);
    if (computed != null) this.age = computed;
  }
  next();
});

patientSchema.index({ registrationStatus: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ fullName: 'text', phone: 'text', email: 'text', patientId: 'text', registrationNumber: 'text' });

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
