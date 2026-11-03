import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { generatePrescriptionId } from '../utils/idHelper.js';

// @route  GET /api/prescriptions?patientId=...
const getPrescriptions = asyncHandler(async (req, res) => {
  const { patientId, doctorId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (patientId) query.patientId = patientId;
  if (doctorId) query.doctorId = doctorId;

  const total = await Prescription.countDocuments(query);
  const prescriptions = await Prescription
    .find(query)
    .sort({ prescriptionDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName specialization')
    .lean();

  return sendSuccess(res, { data: { prescriptions, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load prescriptions');

// @route  GET /api/prescriptions/:id
const getPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id).populate('doctorId', 'fullName specialization').lean();
  if (!prescription) return sendError(res, { status: 404, message: MESSAGES.PRESCRIPTION_NOT_FOUND });
  return sendSuccess(res, { data: { prescription } });
}, 'Could not load prescription');

// @route  POST /api/prescriptions
// @access doctor
const createPrescription = asyncHandler(async (req, res) => {
  const { patientId, appointmentId, medicalRecordId, diagnosis, notes, medicines } = req.body;

  if (!patientId) return sendError(res, { status: 400, message: 'A patient is required' });
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return sendError(res, { status: 400, message: 'At least one medicine is required' });
  }

  const patient = await Patient.findById(patientId).select('_id').lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const count = await Prescription.countDocuments();
  const prescription = await Prescription.create({
    prescriptionId: generatePrescriptionId(count),
    patientId, appointmentId, medicalRecordId,
    doctorId: req.user._id,
    prescriptionDate: new Date(),
    diagnosis, notes, medicines,
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.PRESCRIPTION_CREATED, data: { prescription } });
}, 'Could not create prescription');

// @route  PUT /api/prescriptions/:id
// @access doctor (own prescriptions only)
const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) return sendError(res, { status: 404, message: MESSAGES.PRESCRIPTION_NOT_FOUND });
  if (prescription.doctorId.toString() !== req.user._id.toString()) {
    return sendError(res, { status: 403, message: MESSAGES.FORBIDDEN });
  }

  const { diagnosis, notes, medicines } = req.body;
  if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
  if (notes !== undefined) prescription.notes = notes;
  if (medicines !== undefined) prescription.medicines = medicines;
  await prescription.save();

  return sendSuccess(res, { message: 'Prescription updated', data: { prescription } });
}, 'Could not update prescription');

export { getPrescriptions, getPrescription, createPrescription, updatePrescription };
