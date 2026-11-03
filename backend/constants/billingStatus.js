export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  REFUNDED: 'refunded',
};
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'UPI',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
};
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);
