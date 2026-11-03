import mongoose from 'mongoose';
import { PAYMENT_STATUS_VALUES, PAYMENT_STATUS, PAYMENT_METHOD_VALUES } from '../constants/billingStatus.js';

/**
 * Billing — one bill per appointment/visit. totalAmount and amountDue are
 * NEVER trusted from the client; they are always (re)computed on the
 * backend from the itemised charges (see utils/billingHelper.js).
 */
const billingSchema = new mongoose.Schema(
  {
    billId: { type: String, required: true, unique: true, trim: true }, // e.g. "BILL-000123"

    // ── References ──────────────────────────────────────
    patientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    doctorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receptionistId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Itemised charges ─────────────────────────────────
    consultationFee:  { type: Number, default: 0, min: 0 },
    laboratoryCharges:{ type: Number, default: 0, min: 0 },
    medicineCharges:  { type: Number, default: 0, min: 0 },
    otherCharges:     { type: Number, default: 0, min: 0 },
    discount:         { type: Number, default: 0, min: 0 },
    tax:              { type: Number, default: 0, min: 0 },

    // ── Computed totals (see utils/billingHelper.js — never trust the client) ──
    totalAmount: { type: Number, default: 0, min: 0 },

    // ── Payment ──────────────────────────────────────────
    amountPaid: { type: Number, default: 0, min: 0 },
    amountDue:  { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: PAYMENT_STATUS.PENDING },
    paymentMethod: { type: String, enum: PAYMENT_METHOD_VALUES },
    transactionId: { type: String, trim: true },
    paymentDate:   { type: Date },
  },
  { timestamps: true }
);

billingSchema.index({ patientId: 1, createdAt: -1 });
billingSchema.index({ appointmentId: 1 });
billingSchema.index({ paymentStatus: 1 });

const Billing = mongoose.model('Billing', billingSchema);
export default Billing;
