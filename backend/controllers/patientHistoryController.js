import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Prescription from '../models/Prescription.js';
import LabReport from '../models/LabReport.js';
import PatientDocument from '../models/PatientDocument.js';
import Billing from '../models/Billing.js';
import { USER_ROLES } from '../constants/roles.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';

// @route  GET /api/patients/:id/history
// @access administrator | receptionist | doctor
// Combines every clinically-relevant collection for a single registered
// patient, sorted chronologically, for the doctor's "open patient" view.
// Billing/payment information is included only for roles authorized to see
// it (administrator, receptionist) — a doctor sees clinical data only.
const getPatientHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await Patient.findById(id).lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const [appointments, medicalRecords, prescriptions, labReports, documents, billing] = await Promise.all([
    Appointment.find({ patientId: id }).sort({ date: -1 }).populate('doctorId', 'fullName specialization').lean(),
    MedicalRecord.find({ patientId: id }).sort({ createdAt: -1 }).populate('doctorId', 'fullName specialization').lean(),
    Prescription.find({ patientId: id }).sort({ prescriptionDate: -1 }).populate('doctorId', 'fullName').lean(),
    LabReport.find({ patientId: id }).sort({ createdAt: -1 }).populate('doctorId', 'fullName').lean(),
    PatientDocument.find({ patientId: id }).sort({ createdAt: -1 }).populate('uploadedBy', 'fullName').lean(),
    req.user.role === USER_ROLES.DOCTOR
      ? Promise.resolve(null) // doctors are not authorized to view billing
      : Billing.find({ patientId: id }).sort({ createdAt: -1 }).lean(),
  ]);

  return sendSuccess(res, {
    data: {
      patient,
      appointments,
      medicalRecords,
      prescriptions,
      labReports,
      documents,
      billing, // null for doctors — omitted from their view by design
    },
  });
}, 'Could not load patient history');

export { getPatientHistory };
