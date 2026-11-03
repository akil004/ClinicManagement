import mongoose from 'mongoose';
import { LAB_REPORT_STATUS_VALUES, LAB_REPORT_STATUS } from '../constants/labReportStatus.js';

/**
 * LabReport — a separate collection so a patient's lab-report history stays
 * browsable independent of the consultation/prescription that ordered it.
 */
const labReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true, trim: true }, // e.g. "LAB-000123"

    // ── References ──────────────────────────────────────
    patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    // ── Report ───────────────────────────────────────────
    reportName:      { type: String, required: [true, 'Report name is required'], trim: true }, // e.g. "Complete Blood Count"
    reportType:      { type: String, trim: true }, // e.g. "Blood Test", "Imaging", "Urine Test"
    testDate:        { type: Date },
    resultDate:      { type: Date },
    result:          { type: String, trim: true },
    unit:            { type: String, trim: true },
    referenceRange:  { type: String, trim: true },
    interpretation:  { type: String, trim: true }, // e.g. "Normal", "Abnormal", "Borderline"
    notes:           { type: String, trim: true },

    // ── Status ───────────────────────────────────────────
    status: { type: String, enum: LAB_REPORT_STATUS_VALUES, default: LAB_REPORT_STATUS.PENDING },

    // ── Review ───────────────────────────────────────────
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

labReportSchema.index({ patientId: 1, createdAt: -1 });
labReportSchema.index({ doctorId: 1 });
labReportSchema.index({ status: 1 });

const LabReport = mongoose.model('LabReport', labReportSchema);
export default LabReport;
