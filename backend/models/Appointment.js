import mongoose from 'mongoose';
import { REJECTION_REASON_TYPES, APPOINTMENT_STATUS_VALUES } from '../constants/status.js';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true, trim: true }, // e.g. "APT-000123"

    // ── Patient (registration & appointment are kept as separate concepts —
    // an appointment always references an already-registered Patient
    // document; it never creates one). ──
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'A registered patient is required'],
    },

    // Denormalised snapshot of the patient's details at booking time, kept
    // purely for fast list rendering / backward compatibility with the
    // existing UI. patientId remains the source of truth.
    patientName:       { type: String, required: [true, 'Patient name is required'], trim: true },
    patientAge:        { type: Number },
    patientPhone:      { type: String, trim: true },
    patientEmail:      { type: String, trim: true, lowercase: true },
    patientBloodGroup: { type: String },
    patientGender:     { type: String, enum: ['Male', 'Female', 'Other'] },

    // ── Doctor & booking staff ──
    doctorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName:     { type: String, required: true },
    receptionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who booked it
    specializationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialization' },

    // ── Scheduling ──
    date:      { type: Date, required: [true, 'Appointment date is required'] },
    timeSlot:  { type: String, required: [true, 'Time slot is required'] },
    appointmentType: { type: String, trim: true, default: 'Consultation' },
    complaint: { type: String, trim: true }, // a.k.a. reasonForVisit
    symptoms:  [{ type: String, trim: true }],
    notes:     { type: String, trim: true },

    // ── Status (independent from the patient's registration status) ──
    status: {
      type:    String,
      enum:    APPOINTMENT_STATUS_VALUES,
      default: 'pending',
    },

    // ── Rejection details ──
    rejectionReasonType: {
      type: String,
      enum: REJECTION_REASON_TYPES,
    },
    rejectionReason: { type: String, trim: true },
    rejectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt:      { type: Date },

    // ── Cancellation ──
    cancellationReason: { type: String, trim: true },
    cancelledBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt:         { type: Date },

    // ── Rescheduling (previousAppointmentDate/Time in spec terms) ──
    rescheduledDate:     { type: Date },
    rescheduledTimeSlot: { type: String },
    rescheduledBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rescheduledAt:       { type: Date },

    // ── Completion ──
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Audit ──
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt:  { type: Date },
  },
  { timestamps: true }
);

// Indexes for common queries
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ patientPhone: 1 });
appointmentSchema.index({ patientId: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export { REJECTION_REASON_TYPES };
export default Appointment;
