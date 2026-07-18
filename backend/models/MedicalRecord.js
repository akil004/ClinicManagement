import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  dosage:   { type: String },
  duration: { type: String },
  notes:    { type: String },
}, { _id: false });

const labReportSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  date:    { type: Date },
  result:  { type: String },
  fileUrl: { type: String },
}, { _id: true });

const surgerySchema = new mongoose.Schema({
  name:  { type: String },
  date:  { type: Date },
  notes: { type: String },
}, { _id: false });

const medicalRecordSchema = new mongoose.Schema(
  {
    // ── Patient (keyed by phone since no Patient model) ──
    patientName:       { type: String, required: true, trim: true },
    patientPhone:      { type: String, trim: true },
    patientAge:        { type: Number },
    patientGender:     { type: String },
    patientBloodGroup: { type: String },

    // ── Linked doctor & appointment ──
    doctorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorName:     { type: String },
    appointmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // ── Medical data ──
    diagnosis:       { type: String, trim: true },
    prescription:    [prescriptionItemSchema],
    labReports:      [labReportSchema],
    allergies:       [{ type: String }],
    chronicDiseases: [{ type: String }],
    surgeries:       [surgerySchema],
    doctorNotes:     { type: String, trim: true },

    // ── Emergency contact ──
    emergencyContact: {
      name:     { type: String },
      phone:    { type: String },
      relation: { type: String },
    },
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patientPhone: 1 });
medicalRecordSchema.index({ patientName: 1 });
medicalRecordSchema.index({ doctorId: 1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
export default MedicalRecord;
