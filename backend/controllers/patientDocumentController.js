import PatientDocument from '../models/PatientDocument.js';
import Patient from '../models/Patient.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { generateDocumentId } from '../utils/idHelper.js';

// @route  GET /api/documents?patientId=...
const getDocuments = asyncHandler(async (req, res) => {
  const { patientId, documentType } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (patientId) query.patientId = patientId;
  if (documentType) query.documentType = documentType;

  const total = await PatientDocument.countDocuments(query);
  const documents = await PatientDocument
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'fullName role')
    .lean();

  return sendSuccess(res, { data: { documents, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load documents');

// @route  POST /api/documents
// @access administrator | receptionist | doctor
// Stores only the file's location/reference (fileUrl) — not the file bytes
// — matching this project's architecture (no GridFS/object storage yet).
const createDocument = asyncHandler(async (req, res) => {
  const { patientId, documentType, documentName, description, fileUrl, fileName, mimeType, fileSize } = req.body;

  if (!patientId) return sendError(res, { status: 400, message: 'A patient is required' });
  if (!documentType) return sendError(res, { status: 400, message: 'Document type is required' });
  if (!documentName?.trim()) return sendError(res, { status: 400, message: 'Document name is required' });
  if (!fileUrl?.trim()) return sendError(res, { status: 400, message: 'A file URL/reference is required' });

  const patient = await Patient.findById(patientId).select('_id').lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const count = await PatientDocument.countDocuments();
  const document = await PatientDocument.create({
    documentId: generateDocumentId(count),
    patientId, documentType, documentName, description, fileUrl, fileName, mimeType, fileSize,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.DOCUMENT_UPLOADED, data: { document } });
}, 'Could not save document');

// @route  DELETE /api/documents/:id
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await PatientDocument.findById(req.params.id);
  if (!document) return sendError(res, { status: 404, message: MESSAGES.DOCUMENT_NOT_FOUND });
  await document.deleteOne();
  return sendSuccess(res, { message: 'Document removed' });
}, 'Could not delete document');

export { getDocuments, createDocument, deleteDocument };
