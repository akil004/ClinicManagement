import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage:       { type: String, trim: true },   // e.g. "500mg"
    frequency:    { type: String, trim: true },   // e.g. "Twice a day"
    route:        { type: String, trim: true },   // e.g. "Oral", "IV", "Topical"
    duration:     { type: String, trim: true },   // e.g. "5 days"
    quantity:     { type: Number, min: 0 },
    instructions: { type: String, trim: true },   // e.g. "After food"
  },
  { _id: false }
);

/**
 * Prescription — a separate collection from MedicalRecord so past
 * prescriptions remain independently browsable in patient history even as
 * new consultations/records are added.
 */
const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, required: true, unique: true, trim: true }, // e.g. "RX-000123"

    // ── References ──────────────────────────────────────
    patientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    medicalRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },

    prescriptionDate: { type: Date, default: Date.now },
    diagnosis:        { type: String, trim: true },
    notes:             { type: String, trim: true },

    medicines: {
      type: [medicineSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A prescription must include at least one medicine',
      },
    },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
