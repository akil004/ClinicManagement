import mongoose from 'mongoose';

/**
 * MedicalRecord — one clinical note per consultation. A patient accrues a
 * new MedicalRecord on every consultation rather than an existing one being
 * overwritten, so their full clinical history is preserved and browsable
 * (see controllers/patientHistoryController.js).
 */
const medicalRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true, trim: true }, // e.g. "MR-000123"

    // ── References ──────────────────────────────────────
    patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // ── Clinical information ────────────────────────────
    chiefComplaint:   { type: String, trim: true },
    symptoms:         [{ type: String, trim: true }],
    diagnosis:        { type: String, trim: true },
    diagnosisDetails: { type: String, trim: true },
    treatmentPlan:    { type: String, trim: true },
    doctorNotes:      { type: String, trim: true },

    // ── Vitals ───────────────────────────────────────────
    vitals: {
      bloodPressure:    { type: String, trim: true }, // e.g. "120/80"
      heartRate:        { type: Number },              // bpm
      respiratoryRate:  { type: Number },               // breaths/min
      temperature:      { type: Number },                // °F or °C, per hospital convention
      oxygenSaturation: { type: Number },                 // % SpO2
      weight:           { type: Number },                  // kg
      height:            { type: Number },                  // cm
      bmi:               { type: Number },                  // computed below when weight+height present
    },

    // ── Follow-up ────────────────────────────────────────
    followUpRequired: { type: Boolean, default: false },
    followUpDate:      { type: Date },
    followUpNotes:      { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-compute BMI (kg / m^2) whenever both weight and height are present.
medicalRecordSchema.pre('save', function computeBmi(next) {
  const { weight, height } = this.vitals || {};
  if (weight && height) {
    const heightMeters = height / 100;
    this.vitals.bmi = Math.round((weight / (heightMeters * heightMeters)) * 10) / 10;
  }
  next();
});

medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index({ appointmentId: 1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
