import React from 'react';

/**
 * DoctorScheduleModal — read-only view of a doctor's working days/slots,
 * used by the Receptionist "View Doctor Schedule" action.
 */
export default function DoctorScheduleModal({ doctor, onClose, onBook }) {
  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-custom" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-custom-header">
          <h5 className="modal-custom-title">{doctor.fullName}'s Schedule</h5>
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-custom-body">
          <div className="mb-3" style={{ fontSize: 13.5, color: '#64748b' }}>
            {doctor.specialization} · {doctor.department || 'General'}
          </div>

          <div className="mb-3">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Available Days</div>
            <div className="d-flex flex-wrap gap-2">
              {(doctor.availableDays ?? []).length === 0
                ? <span className="text-muted" style={{ fontSize: 13 }}>Not specified</span>
                : doctor.availableDays.map((d) => (
                    <span key={d} className="badge-status badge-active">{d}</span>
                  ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Time Slots</div>
            <div className="d-flex flex-wrap gap-2">
              {(doctor.availableTimeSlots ?? []).length === 0
                ? <span className="text-muted" style={{ fontSize: 13 }}>Not specified</span>
                : doctor.availableTimeSlots.map((t) => (
                    <span key={t} className="badge-status badge-completed">{t}</span>
                  ))}
            </div>
          </div>
        </div>
        <div className="modal-custom-footer">
          <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={onClose}>Close</button>
          {onBook && (
            <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={onBook}>
              <i className="bi bi-calendar-plus me-1" />Book with this Doctor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
