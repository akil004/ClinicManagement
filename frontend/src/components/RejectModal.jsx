import React, { useState } from 'react';

export const REJECTION_REASON_TYPES = [
  'Patient not eligible for treatment',
  'Incomplete medical information',
  'Appointment booked incorrectly',
  'Specialist unavailable',
  'Duplicate appointment',
  'Medical contraindication',
  'Patient requested cancellation',
  'Other',
];

/**
 * RejectModal — doctor rejection form with mandatory reason.
 *
 * Props:
 *   appointment  { _id, patientName, timeSlot, date }
 *   onConfirm    async fn({ rejectionReasonType, rejectionReason })
 *   onClose      fn()
 *   loading      boolean
 */
const RejectModal = ({ appointment, onConfirm, onClose, loading = false }) => {
  const [reasonType,    setReasonType]    = useState('');
  const [customReason,  setCustomReason]  = useState('');
  const [fieldErrors,   setFieldErrors]   = useState({});

  const validate = () => {
    const errors = {};
    if (!reasonType)                               errors.reasonType   = 'Please select a rejection reason';
    if (reasonType === 'Other' && !customReason.trim())
                                                   errors.customReason = 'Please describe the reason';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onConfirm({
      rejectionReasonType: reasonType,
      rejectionReason:     reasonType === 'Other' ? customReason.trim() : reasonType,
    });
  };

  const apptDate = appointment?.date
    ? new Date(appointment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-custom" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-custom-header">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 22 }}>🚫</span>
            <h5 className="modal-custom-title mb-0">Reject Appointment</h5>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Patient summary */}
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '12px 22px' }}>
          <div className="d-flex gap-4 flex-wrap">
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#9a3412', fontWeight: 700 }}>Patient</div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{appointment?.patientName ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#9a3412', fontWeight: 700 }}>Date</div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{apptDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#9a3412', fontWeight: 700 }}>Time</div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{appointment?.timeSlot ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-custom-body">
            {/* Reason type dropdown */}
            <div className="mb-4">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Reason for Rejection <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className={`form-select ${fieldErrors.reasonType ? 'is-invalid' : ''}`}
                style={{ borderRadius: 10 }}
                value={reasonType}
                onChange={(e) => { setReasonType(e.target.value); setCustomReason(''); }}
              >
                <option value="">— Select a reason —</option>
                {REJECTION_REASON_TYPES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {fieldErrors.reasonType && (
                <div className="field-error mt-1">{fieldErrors.reasonType}</div>
              )}
            </div>

            {/* Custom reason textarea — shown only when "Other" is selected */}
            {reasonType === 'Other' && (
              <div className="mb-2">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Enter Custom Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  className={`form-control ${fieldErrors.customReason ? 'is-invalid' : ''}`}
                  style={{ borderRadius: 10, resize: 'vertical' }}
                  placeholder="Describe the reason for rejection clearly..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
                {fieldErrors.customReason && (
                  <div className="field-error mt-1">{fieldErrors.customReason}</div>
                )}
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {customReason.trim().length}/500 characters
                </div>
              </div>
            )}

            {/* Info box */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
              <i className="bi bi-info-circle me-2" />
              The receptionist will be notified and can contact the patient to reschedule.
            </div>
          </div>

          {/* Footer */}
          <div className="modal-custom-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              style={{ borderRadius: 8 }}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              style={{ borderRadius: 8, minWidth: 120 }}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" />Rejecting…</>
                : <><i className="bi bi-x-circle me-2" />Reject Appointment</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectModal;
