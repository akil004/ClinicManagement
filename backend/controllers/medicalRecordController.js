import MedicalRecord from '../models/MedicalRecord.js';
import Patient from '../models/Patient.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { generateRecordId } from '../utils/idHelper.js';

// @route  GET /api/medical-records?patientId=...
const getMedicalRecords = asyncHandler(async (req, res) => {
  const { patientId, doctorId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (patientId) query.patientId = patientId;
  if (doctorId) query.doctorId = doctorId;

  const total = await MedicalRecord.countDocuments(query);
  const records = await MedicalRecord
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName specialization')
    .lean();

  return sendSuccess(res, { data: { records, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load medical records');

// @route  POST /api/medical-records
// @access doctor
// Every consultation creates a NEW record rather than overwriting an old
// one, so the patient's clinical history is fully preserved.
const createMedicalRecord = asyncHandler(async (req, res) => {
  const {
    patientId, appointmentId, chiefComplaint, symptoms, diagnosis, diagnosisDetails,
    treatmentPlan, doctorNotes, vitals, followUpRequired, followUpDate, followUpNotes,
  } = req.body;

  if (!patientId) return sendError(res, { status: 400, message: 'A patient is required' });

  const patient = await Patient.findById(patientId).select('_id').lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const count = await MedicalRecord.countDocuments();
  const record = await MedicalRecord.create({
    recordId: generateRecordId(count),
    patientId, appointmentId, doctorId: req.user._id,
    chiefComplaint, symptoms, diagnosis, diagnosisDetails, treatmentPlan, doctorNotes,
    vitals, followUpRequired, followUpDate, followUpNotes,
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.MEDICAL_RECORD_CREATED, data: { record } });
}, 'Could not create medical record');

// @route  PUT /api/medical-records/:id
// @access doctor (own records only)
const updateMedicalRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return sendError(res, { status: 404, message: MESSAGES.MEDICAL_RECORD_NOT_FOUND });

  if (record.doctorId.toString() !== req.user._id.toString()) {
    return sendError(res, { status: 403, message: MESSAGES.FORBIDDEN });
  }

  const EDITABLE = [
    'chiefComplaint', 'symptoms', 'diagnosis', 'diagnosisDetails', 'treatmentPlan',
    'doctorNotes', 'vitals', 'followUpRequired', 'followUpDate', 'followUpNotes',
  ];
  EDITABLE.forEach((f) => { if (req.body[f] !== undefined) record[f] = req.body[f]; });
  await record.save();

  return sendSuccess(res, { message: 'Medical record updated', data: { record } });
}, 'Could not update medical record');

export { getMedicalRecords, createMedicalRecord, updateMedicalRecord };
