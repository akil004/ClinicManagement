import React, { useState } from 'react';
import PatientHistoryModal from './PatientHistoryModal.jsx';

const STATUS_MAP = {
  pending:   { cls: 'badge-pending',   label: 'Pending'   },
  approved:  { cls: 'badge-active',    label: 'Approved'  },
  rejected:  { cls: 'badge-cancelled', label: 'Rejected'  },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-inactive',  label: 'Cancelled' },
};

/**
 * AppointmentDetailModal — shown when a doctor clicks an appointment.
 *
 * Props:
 *   appointment  object    full appointment document
 *   onApprove    fn()
 *   onReject     fn()      triggers the RejectModal
 *   onComplete   fn(notes)
 *   onClose      fn()
 *   loading      boolean
 */
const AppointmentDetailModal = ({ appointment: appt, onApprove, onReject, onComplete, onClose, loading }) => {
  const [notes,       setNotes]       = useState(appt?.notes ?? '');
  const [showHistory, setShowHistory] = useState(false);

  if (!appt) return null;

  const statusInfo = STATUS_MAP[appt.status] ?? STATUS_MAP.pending;
  const apptDate   = appt.date
    ? new Date(appt.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const Section = ({ title, icon, children }) => (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <h6 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
        <i className={`bi ${icon} me-2 text-primary`} />{title}
      </h6>
      {children}
    </div>
  );

  const Field = ({ label, value }) => (
    <div className="mb-2">
      <small style={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '.06em' }}>{label}</small>
      <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2 }}>{value || <span className="text-muted">—</span>}</div>
    </div>
  );

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose}>
        <div
          className="modal-custom"
          style={{ maxWidth: 720, width: '95%' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-custom-header">
            <div>
              <h5 className="modal-custom-title mb-1">Appointment Details</h5>
              <span className={`badge-status ${statusInfo.cls}`}>{statusInfo.label}</span>
            </div>
            <button className="modal-close-btn" onClick={onClose} disabled={loading}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 22px', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="row g-3">

              {/* Patient details */}
              <div className="col-md-6">
                <Section title="Patient Details" icon="bi-person">
                  <Field label="Name"        value={appt.patientName} />
                  <Field label="Age"         value={appt.patientAge ? `${appt.patientAge} yrs` : undefined} />
                  <Field label="Gender"      value={appt.patientGender} />
                  <Field label="Blood Group" value={appt.patientBloodGroup} />
                  <Field label="Phone"       value={appt.patientPhone} />
                  <Field label="Email"       value={appt.patientEmail} />
                  {appt.patientPhone && (
                    <button
                      className="btn btn-sm btn-outline-info mt-2"
                      style={{ borderRadius: 8, fontSize: 12 }}
                      onClick={() => setShowHistory(true)}
                    >
                      <i className="bi bi-clock-history me-1" />View Full Medical History
                    </button>
                  )}
                </Section>
              </div>

              {/* Appointment details */}
              <div className="col-md-6">
                <Section title="Appointment Info" icon="bi-calendar-event">
                  <Field label="Date"       value={apptDate} />
                  <Field label="Time Slot"  value={appt.timeSlot} />
                  <Field label="Complaint"  value={appt.complaint} />
                  {appt.status === 'rejected' && (
                    <>
                      <div style={{ height: 1, background: '#e2e8f0', margin: '10px 0' }} />
                      <div style={{ background: '#fef2f2', borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: 6 }}>
                          Rejection Details
                        </div>
                        <Field label="Reason Type" value={appt.rejectionReasonType} />
                        <Field label="Reason"      value={appt.rejectionReason} />
                        <Field label="Rejected By" value={appt.rejectedBy?.fullName} />
                        <Field label="Rejected At" value={appt.rejectedAt ? new Date(appt.rejectedAt).toLocaleString('en-IN') : undefined} />
                      </div>
                    </>
                  )}
                </Section>
              </div>

              {/* Notes */}
              <div className="col-12">
                <Section title="Doctor Notes" icon="bi-journal-text">
                  <textarea
                    rows={3}
                    className="form-control"
                    style={{ borderRadius: 10, fontSize: 14 }}
                    placeholder="Add consultation notes, observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={['rejected', 'cancelled'].includes(appt.status)}
                  />
                </Section>
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="modal-custom-footer" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={onClose} disabled={loading}>
              Close
            </button>

            <div className="d-flex gap-2 flex-wrap ms-auto">
              {appt.status === 'pending' && (
                <>
                  <button className="btn btn-success" style={{ borderRadius: 8 }} onClick={onApprove} disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check-circle me-1" />Approve</>}
                  </button>
                  <button className="btn btn-danger" style={{ borderRadius: 8 }} onClick={onReject} disabled={loading}>
                    <i className="bi bi-x-circle me-1" />Reject
                  </button>
                </>
              )}
              {appt.status === 'approved' && (
                <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => onComplete(notes)} disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check2-all me-1" />Mark Complete</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient history modal — layered on top */}
      {showHistory && (
        <PatientHistoryModal
          patientPhone={appt.patientPhone}
          patientName={appt.patientName}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
};

export default AppointmentDetailModal;
