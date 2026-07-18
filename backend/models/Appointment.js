import mongoose from 'mongoose';

const REJECTION_REASON_TYPES = [
  'Patient not eligible for treatment',
  'Incomplete medical information',
  'Appointment booked incorrectly',
  'Specialist unavailable',
  'Duplicate appointment',
  'Medical contraindication',
  'Patient requested cancellation',
  'Other',
];

const appointmentSchema = new mongoose.Schema(
  {
    // ── Patient info (denormalised — no separate Patient model yet) ──
    patientName:       { type: String, required: [true, 'Patient name is required'], trim: true },
    patientAge:        { type: Number },
    patientPhone:      { type: String, trim: true },
    patientEmail:      { type: String, trim: true, lowercase: true },
    patientBloodGroup: { type: String },
    patientGender:     { type: String, enum: ['Male', 'Female', 'Other'] },

    // ── Doctor ──
    doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },

    // ── Scheduling ──
    date:      { type: Date, required: [true, 'Appointment date is required'] },
    timeSlot:  { type: String, required: [true, 'Time slot is required'] },
    complaint: { type: String, trim: true },
    notes:     { type: String, trim: true },

    // ── Status ──
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
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

    // ── Rescheduling ──
    rescheduledDate:     { type: Date },
    rescheduledTimeSlot: { type: String },
    rescheduledBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rescheduledAt:       { type: Date },

    // ── Audit ──
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt:  { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for common queries
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ patientPhone: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export { REJECTION_REASON_TYPES };
export default Appointment;
