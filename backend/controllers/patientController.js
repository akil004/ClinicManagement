import Patient from '../models/Patient.js';
import { PATIENT_STATUS } from '../constants/status.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { generatePatientId, generateRegistrationNumber } from '../utils/idHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { isValidEmail } from '../utils/validationHelper.js';

const PATIENT_FIELDS = [
  'fullName', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup',
  'phone', 'alternatePhone', 'email', 'address', 'city', 'state', 'postalCode',
  'emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone',
  'occupation', 'maritalStatus', 'nationality',
  'allergies', 'chronicDiseases', 'previousSurgeries', 'currentMedications',
  'familyMedicalHistory', 'pastMedicalHistory', 'disabilityInformation',
];

const pickPatientFields = (body) => {
  const out = {};
  PATIENT_FIELDS.forEach((f) => {
    if (body[f] !== undefined) out[f] = body[f];
  });
  return out;
};

// @route  POST /api/patients
// @access administrator | receptionist
// A new patient registration always starts as "pending" — it does NOT
// appear in the Registered Patients list, and no appointment is created.
const createPatient = asyncHandler(async (req, res) => {
  const data = pickPatientFields(req.body);

  if (!data.fullName?.trim()) {
    return sendError(res, { status: 400, message: 'Full name is required' });
  }
  if (!data.phone?.trim()) {
    return sendError(res, { status: 400, message: 'Phone number is required' });
  }
  if (data.email && !isValidEmail(data.email)) {
    return sendError(res, { status: 400, message: 'Invalid email address' });
  }

  const count = await Patient.countDocuments();
  const patientId = generatePatientId(count);
  const registrationNumber = generateRegistrationNumber(count);

  const patient = await Patient.create({
    ...data,
    patientId,
    registrationNumber,
    registrationStatus: PATIENT_STATUS.PENDING,
    registrationDate: new Date(),
    registeredBy: req.user._id,
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.REGISTRATION_SUCCESS, data: { patient } });
}, 'Could not register patient');

// @route  GET /api/patients/pending
// @access administrator | receptionist
const getPendingPatients = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const query = { registrationStatus: PATIENT_STATUS.PENDING };
  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [{ fullName: re }, { phone: re }, { email: re }, { patientId: re }, { registrationNumber: re }];
  }

  const total = await Patient.countDocuments(query);
  const patients = await Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  return sendSuccess(res, { data: { patients, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load pending registrations');

// @route  GET /api/patients/registered
// @access administrator | receptionist | doctor
const getRegisteredPatients = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const query = { registrationStatus: PATIENT_STATUS.REGISTERED };
  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [{ fullName: re }, { phone: re }, { email: re }, { patientId: re }, { registrationNumber: re }];
  }

  const total = await Patient.countDocuments(query);
  const patients = await Patient.find(query).sort({ fullName: 1 }).skip(skip).limit(limit).lean();

  return sendSuccess(res, { data: { patients, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load registered patients');

// @route  GET /api/patients/rejected
// @access administrator | receptionist
const getRejectedPatients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { registrationStatus: PATIENT_STATUS.REJECTED };

  const total = await Patient.countDocuments(query);
  const patients = await Patient.find(query)
    .sort({ rejectedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('rejectedBy', 'fullName')
    .lean();

  return sendSuccess(res, { data: { patients, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load rejected registrations');

// @route  GET /api/patients/:id
const getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('approvedBy', 'fullName')
    .populate('rejectedBy', 'fullName')
    .populate('registeredBy', 'fullName')
    .lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });
  return sendSuccess(res, { data: { patient } });
}, 'Could not load patient');

// @route  PUT /api/patients/:id
// @access administrator | receptionist
// Edits the registration details. Does not change registrationStatus.
const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const data = pickPatientFields(req.body);
  if (data.email && !isValidEmail(data.email)) {
    return sendError(res, { status: 400, message: 'Invalid email address' });
  }

  Object.assign(patient, data);
  await patient.save();

  return sendSuccess(res, { message: 'Patient record updated', data: { patient } });
}, 'Could not update patient');

// @route  PUT /api/patients/:id/approve
// @access administrator | receptionist
const approvePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });
  if (patient.registrationStatus !== PATIENT_STATUS.PENDING) {
    return sendError(res, { status: 400, message: MESSAGES.PATIENT_ALREADY_PROCESSED });
  }

  patient.registrationStatus = PATIENT_STATUS.REGISTERED;
  patient.approvedBy = req.user._id;
  patient.approvedAt = new Date();
  // Clear any stale rejection audit fields from a prior cycle, if present.
  patient.rejectionReason = undefined;
  patient.rejectedBy = undefined;
  patient.rejectedAt = undefined;
  await patient.save();

  return sendSuccess(res, { message: MESSAGES.REGISTRATION_APPROVED, data: { patient } });
}, 'Could not approve registration');

// @route  PUT /api/patients/:id/reject
// @access administrator | receptionist
// @body   { rejectionReason }
// The registration record is kept (never deleted) — this is an audit trail.
const rejectPatient = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;
  if (!rejectionReason?.trim()) {
    return sendError(res, { status: 400, message: 'A rejection reason is required' });
  }

  const patient = await Patient.findById(req.params.id);
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });
  if (patient.registrationStatus !== PATIENT_STATUS.PENDING) {
    return sendError(res, { status: 400, message: MESSAGES.PATIENT_ALREADY_PROCESSED });
  }

  patient.registrationStatus = PATIENT_STATUS.REJECTED;
  patient.rejectionReason = rejectionReason.trim();
  patient.rejectedBy = req.user._id;
  patient.rejectedAt = new Date();
  await patient.save();

  const populated = await Patient.findById(patient._id).populate('rejectedBy', 'fullName').lean();
  return sendSuccess(res, { message: MESSAGES.REGISTRATION_REJECTED, data: { patient: populated } });
}, 'Could not reject registration');

// @route  GET /api/patients/search?q=...
// @access administrator | receptionist | doctor  (used by the appointment
// booking flow to find an already-registered patient — registration and
// booking stay separate steps.)
const searchRegisteredPatients = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return sendSuccess(res, { data: { patients: [] } });

  const re = new RegExp(q.trim(), 'i');
  const patients = await Patient.find({
    registrationStatus: PATIENT_STATUS.REGISTERED,
    $or: [{ fullName: re }, { phone: re }, { patientId: re }, { registrationNumber: re }],
  }).limit(15).lean();

  return sendSuccess(res, { data: { patients } });
}, 'Could not search patients');

export {
  createPatient, getPendingPatients, getRegisteredPatients, getRejectedPatients,
  getPatient, updatePatient, approvePatient, rejectPatient, searchRegisteredPatients,
};
