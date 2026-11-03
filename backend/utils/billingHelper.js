/**
 * billingHelper.js — the backend is always the source of truth for money
 * math. Never trust a totalAmount/amountDue sent from the frontend.
 */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * calculateBillTotals({ consultationFee, laboratoryCharges, medicineCharges,
 *   otherCharges, discount, tax, amountPaid })
 * → { subtotal, totalAmount, amountPaid, amountDue }
 *
 * tax and discount are treated as flat currency amounts (not percentages),
 * matching the flat numeric fields on the Billing model.
 */
const calculateBillTotals = ({
  consultationFee = 0, laboratoryCharges = 0, medicineCharges = 0, otherCharges = 0,
  discount = 0, tax = 0, amountPaid = 0,
}) => {
  const subtotal = round2(
    Number(consultationFee) + Number(laboratoryCharges) + Number(medicineCharges) + Number(otherCharges)
  );
  const totalAmount = round2(Math.max(0, subtotal - Number(discount) + Number(tax)));
  const paid = round2(Math.min(Number(amountPaid) || 0, totalAmount));
  const amountDue = round2(Math.max(0, totalAmount - paid));

  return { subtotal, totalAmount, amountPaid: paid, amountDue };
};

/** derivePaymentStatus(totalAmount, amountPaid) — 'pending' | 'partially_paid' | 'paid' */
const derivePaymentStatus = (totalAmount, amountPaid) => {
  if (amountPaid <= 0) return 'pending';
  if (amountPaid >= totalAmount) return 'paid';
  return 'partially_paid';
};

export { calculateBillTotals, derivePaymentStatus };
