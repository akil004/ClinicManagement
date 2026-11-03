import LabReport from '../models/LabReport.js';
import Patient from '../models/Patient.js';
import { LAB_REPORT_STATUS } from '../constants/labReportStatus.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { generateReportId } from '../utils/idHelper.js';

// @route  GET /api/lab-reports?patientId=...
const getLabReports = asyncHandler(async (req, res) => {
  const { patientId, status } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (patientId) query.patientId = patientId;
  if (status) query.status = status;

  const total = await LabReport.countDocuments(query);
  const reports = await LabReport
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName')
    .populate('reviewedBy', 'fullName')
    .lean();

  return sendSuccess(res, { data: { reports, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load lab reports');

// @route  POST /api/lab-reports
// @access doctor | administrator
const createLabReport = asyncHandler(async (req, res) => {
  const {
    patientId, appointmentId, reportName, reportType, testDate, resultDate,
    result, unit, referenceRange, interpretation, notes,
  } = req.body;

  if (!patientId) return sendError(res, { status: 400, message: 'A patient is required' });
  if (!reportName?.trim()) return sendError(res, { status: 400, message: 'Report name is required' });

  const patient = await Patient.findById(patientId).select('_id').lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const count = await LabReport.countDocuments();
  const report = await LabReport.create({
    reportId: generateReportId(count),
    patientId, appointmentId,
    doctorId: req.user.role === 'doctor' ? req.user._id : req.body.doctorId,
    reportName, reportType, testDate, resultDate, result, unit, referenceRange, interpretation, notes,
    status: result ? LAB_REPORT_STATUS.COMPLETED : LAB_REPORT_STATUS.PENDING,
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.LAB_REPORT_CREATED, data: { report } });
}, 'Could not create lab report');

// @route  PUT /api/lab-reports/:id
// @access doctor | administrator
const updateLabReport = asyncHandler(async (req, res) => {
  const report = await LabReport.findById(req.params.id);
  if (!report) return sendError(res, { status: 404, message: MESSAGES.LAB_REPORT_NOT_FOUND });

  const EDITABLE = ['result', 'unit', 'referenceRange', 'interpretation', 'notes', 'resultDate', 'status'];
  EDITABLE.forEach((f) => { if (req.body[f] !== undefined) report[f] = req.body[f]; });
  await report.save();

  return sendSuccess(res, { message: 'Lab report updated', data: { report } });
}, 'Could not update lab report');

// @route  PUT /api/lab-reports/:id/review
// @access doctor
const reviewLabReport = asyncHandler(async (req, res) => {
  const report = await LabReport.findById(req.params.id);
  if (!report) return sendError(res, { status: 404, message: MESSAGES.LAB_REPORT_NOT_FOUND });

  report.status = LAB_REPORT_STATUS.REVIEWED;
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  await report.save();

  return sendSuccess(res, { message: 'Lab report reviewed', data: { report } });
}, 'Could not review lab report');

export { getLabReports, createLabReport, updateLabReport, reviewLabReport };
