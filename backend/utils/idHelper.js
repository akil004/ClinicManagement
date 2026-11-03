/**
 * idHelper.js — human-readable ID / temporary-password generation helpers.
 * MongoDB ObjectIds remain the real primary keys; these are friendly,
 * displayable codes layered on top (e.g. "PAT-000123").
 */
import crypto from 'crypto';

const pad = (n, width = 6) => String(n).padStart(width, '0');

/**
 * generateSequentialCode(prefix, count) — builds a code like "PAT-000123"
 * from a running document count. `count` should be the count of existing
 * documents *before* the one being created (e.g. `await Model.countDocuments()`).
 */
const generateSequentialCode = (prefix, count) => `${prefix}-${pad(count + 1)}`;

/** generatePatientId(count) — e.g. generatePatientId(42) => "PAT-000043" */
const generatePatientId = (count) => generateSequentialCode('PAT', count);
/** generateRegistrationNumber(count) — e.g. "REG-000043" */
const generateRegistrationNumber = (count) => generateSequentialCode('REG', count);
/** generateAppointmentId(count) — e.g. generateAppointmentId(7) => "APT-000008" */
const generateAppointmentId = (count) => generateSequentialCode('APT', count);
/** generateRecordId(count) — clinical MedicalRecord code, e.g. "MR-000008" */
const generateRecordId = (count) => generateSequentialCode('MR', count);
/** generatePrescriptionId(count) — e.g. "RX-000008" */
const generatePrescriptionId = (count) => generateSequentialCode('RX', count);
/** generateReportId(count) — LabReport code, e.g. "LAB-000008" */
const generateReportId = (count) => generateSequentialCode('LAB', count);
/** generateDocumentId(count) — PatientDocument code, e.g. "DOC-000008" */
const generateDocumentId = (count) => generateSequentialCode('DOC', count);
/** generateBillId(count) — Billing code, e.g. "BILL-000008" */
const generateBillId = (count) => generateSequentialCode('BILL', count);
/** generateSpecializationId(count) — e.g. "SPEC-000008" */
const generateSpecializationId = (count) => generateSequentialCode('SPEC', count);

/**
 * generateTempPassword — readable, random temporary password used for
 * newly created (or reset) doctor/receptionist accounts.
 */
const generateTempPassword = () => {
  const raw = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return `${raw.slice(0, 8)}#${Math.floor(1000 + Math.random() * 9000)}`;
};

export {
  generateSequentialCode, generatePatientId, generateRegistrationNumber, generateAppointmentId,
  generateRecordId, generatePrescriptionId, generateReportId, generateDocumentId,
  generateBillId, generateSpecializationId, generateTempPassword,
};
