import mongoose from 'mongoose';
import { DOCUMENT_TYPE_VALUES } from '../constants/documentTypes.js';

/**
 * PatientDocument — documents/files uploaded for a patient (lab report
 * scans, medical certificates, previous records, etc). Only the file's
 * location/reference is stored in MongoDB (fileUrl) — not the file bytes
 * themselves — matching this project's existing architecture, which has no
 * GridFS/object-storage integration.
 */
const patientDocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, unique: true, trim: true }, // e.g. "DOC-000123"

    patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    documentType: { type: String, enum: DOCUMENT_TYPE_VALUES, required: true },
    documentName: { type: String, required: [true, 'Document name is required'], trim: true },
    description:  { type: String, trim: true },

    fileUrl:  { type: String, required: [true, 'A file URL/reference is required'], trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileSize: { type: Number, min: 0 }, // bytes

    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

patientDocumentSchema.index({ patientId: 1, createdAt: -1 });
patientDocumentSchema.index({ documentType: 1 });

const PatientDocument = mongoose.model('PatientDocument', patientDocumentSchema);
export default PatientDocument;
