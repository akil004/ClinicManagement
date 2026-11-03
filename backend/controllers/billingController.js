import Billing from '../models/Billing.js';
import Patient from '../models/Patient.js';
import { USER_ROLES } from '../constants/roles.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';
import { parsePagination, buildPaginationMeta } from '../utils/paginationHelper.js';
import { generateBillId } from '../utils/idHelper.js';
import { calculateBillTotals, derivePaymentStatus } from '../utils/billingHelper.js';

// @route  GET /api/billing?patientId=...
const getBills = asyncHandler(async (req, res) => {
  const { patientId, paymentStatus } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (patientId) query.patientId = patientId;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const total = await Billing.countDocuments(query);
  const bills = await Billing
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('doctorId', 'fullName')
    .lean();

  return sendSuccess(res, { data: { bills, ...buildPaginationMeta({ page, limit, total }) } });
}, 'Could not load bills');

// @route  POST /api/billing
// @access administrator | receptionist
// totalAmount / amountDue are always (re)computed here — never trusted
// from the request body.
const createBill = asyncHandler(async (req, res) => {
  const {
    patientId, appointmentId, doctorId, consultationFee, laboratoryCharges,
    medicineCharges, otherCharges, discount, tax, amountPaid, paymentMethod, transactionId,
  } = req.body;

  if (!patientId) return sendError(res, { status: 400, message: 'A patient is required' });

  const patient = await Patient.findById(patientId).select('_id').lean();
  if (!patient) return sendError(res, { status: 404, message: MESSAGES.REGISTRATION_NOT_FOUND });

  const totals = calculateBillTotals({
    consultationFee, laboratoryCharges, medicineCharges, otherCharges, discount, tax, amountPaid,
  });

  const count = await Billing.countDocuments();
  const bill = await Billing.create({
    billId: generateBillId(count),
    patientId, appointmentId, doctorId,
    receptionistId: req.user.role === USER_ROLES.RECEPTIONIST ? req.user._id : undefined,
    consultationFee, laboratoryCharges, medicineCharges, otherCharges, discount, tax,
    totalAmount: totals.totalAmount,
    amountPaid: totals.amountPaid,
    amountDue: totals.amountDue,
    paymentStatus: derivePaymentStatus(totals.totalAmount, totals.amountPaid),
    paymentMethod, transactionId,
    paymentDate: totals.amountPaid > 0 ? new Date() : undefined,
  });

  return sendSuccess(res, { status: 201, message: MESSAGES.BILL_CREATED, data: { bill } });
}, 'Could not create bill');

// @route  PUT /api/billing/:id
// @access administrator | receptionist
// Recomputes totals on every edit — the same rule applies to updates.
const updateBill = asyncHandler(async (req, res) => {
  const bill = await Billing.findById(req.params.id);
  if (!bill) return sendError(res, { status: 404, message: MESSAGES.BILL_NOT_FOUND });

  const EDITABLE_CHARGES = ['consultationFee', 'laboratoryCharges', 'medicineCharges', 'otherCharges', 'discount', 'tax'];
  EDITABLE_CHARGES.forEach((f) => { if (req.body[f] !== undefined) bill[f] = req.body[f]; });
  if (req.body.amountPaid !== undefined) bill.amountPaid = req.body.amountPaid;
  if (req.body.paymentMethod !== undefined) bill.paymentMethod = req.body.paymentMethod;
  if (req.body.transactionId !== undefined) bill.transactionId = req.body.transactionId;

  const totals = calculateBillTotals({
    consultationFee: bill.consultationFee, laboratoryCharges: bill.laboratoryCharges,
    medicineCharges: bill.medicineCharges, otherCharges: bill.otherCharges,
    discount: bill.discount, tax: bill.tax, amountPaid: bill.amountPaid,
  });
  bill.totalAmount = totals.totalAmount;
  bill.amountPaid = totals.amountPaid;
  bill.amountDue = totals.amountDue;
  bill.paymentStatus = derivePaymentStatus(totals.totalAmount, totals.amountPaid);
  if (totals.amountPaid > 0 && !bill.paymentDate) bill.paymentDate = new Date();

  await bill.save();
  return sendSuccess(res, { message: MESSAGES.BILL_UPDATED, data: { bill } });
}, 'Could not update bill');

export { getBills, createBill, updateBill };
