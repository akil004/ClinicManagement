import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { formatDate } from '../utils/dateHelper.js';

const TABS = ['Overview', 'Past Visits', 'Diagnoses', 'Prescriptions', 'Lab Reports'];

// ── Small sub-components ────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div className="d-flex gap-3 py-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
    <div style={{ width: 160, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {label}
    </div>
    <div style={{ fontSize: 14, color: '#1e293b' }}>{value || <span className="text-muted">—</span>}</div>
  </div>
);

const TagList = ({ items = [], color = '#dbeafe', textColor = '#1e40af' }) => (
  items.length === 0
    ? <span className="text-muted" style={{ fontSize: 13 }}>None recorded</span>
    : <div className="d-flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} style={{ background: color, color: textColor, padding: '2px 10px', borderRadius: 20, fontSize: 12.5, fontWeight: 500 }}>
            {item}
          </span>
        ))}
      </div>
);

// ── Main modal ──────────────────────────────────────────
/**
 * PatientHistoryModal — complete patient medical history viewer, backed by
 * GET /api/patients/:id/history, which combines Patient, Appointment,
 * MedicalRecord, Prescription, and LabReport data for one registered patient.
 *
 * Props:
 *   patientId    string   the registered Patient's _id
 *   patientName  string   displayed in header (fallback while loading)
 *   onClose      fn()
 */
const PatientHistoryModal = ({ patientId, patientName, onClose }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [history,   setHistory]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }

    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/patients/${patientId}/history`);
        setHistory(data);
      } catch {
        setHistory({ patient: null, appointments: [], medicalRecords: [], prescriptions: [], labReports: [] });
        setError('Could not load medical history from server — showing empty history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  const patient         = history?.patient;
  const medicalRecords  = history?.medicalRecords ?? [];
  const prescriptions   = history?.prescriptions ?? [];
  const labReports      = history?.labReports ?? [];

  const allDiagnoses = medicalRecords
    .filter((r) => r.diagnosis)
    .map((r) => ({ diagnosis: r.diagnosis, notes: r.doctorNotes, date: r.createdAt, doctor: r.doctorId?.fullName }));

  const renderOverview = () => (
    <div className="row g-4">
      <div className="col-md-6">
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
            <i className="bi bi-person-circle me-2 text-primary" />Patient Information
          </h6>
          <InfoRow label="Full Name"   value={patient?.fullName ?? patientName} />
          <InfoRow label="Age"         value={patient?.age ? `${patient.age} years` : undefined} />
          <InfoRow label="Gender"      value={patient?.gender} />
          <InfoRow label="Blood Group" value={patient?.bloodGroup} />
          <InfoRow label="Phone"       value={patient?.phone} />
        </div>
      </div>
      <div className="col-md-6">
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
            <i className="bi bi-heart-pulse me-2 text-danger" />Health Summary
          </h6>
          <div className="mb-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Allergies</div>
            <TagList items={patient?.allergies ?? []} color="#fee2e2" textColor="#991b1b" />
          </div>
          <div className="mb-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Chronic Diseases</div>
            <TagList items={patient?.chronicDiseases ?? []} color="#fef3c7" textColor="#92400e" />
          </div>
        </div>
      </div>
      {(patient?.emergencyContactName || patient?.emergencyContactPhone) && (
        <div className="col-12">
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 18, border: '1px solid #bbf7d0' }}>
            <h6 style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>
              <i className="bi bi-telephone-fill me-2" />Emergency Contact
            </h6>
            <div className="d-flex gap-4 flex-wrap">
              <InfoRow label="Name"         value={patient.emergencyContactName} />
              <InfoRow label="Phone"        value={patient.emergencyContactPhone} />
              <InfoRow label="Relationship" value={patient.emergencyContactRelationship} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPastVisits = () => (
    medicalRecords.length === 0
      ? <p className="text-muted text-center py-4">No past visit records found.</p>
      : <div className="table-responsive">
          <table className="hospital-table">
            <thead>
              <tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {medicalRecords.map((r) => (
                <tr key={r._id}>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{r.doctorId?.fullName ?? '—'}</td>
                  <td>{r.diagnosis ?? '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.doctorNotes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );

  const renderDiagnoses = () => (
    allDiagnoses.length === 0
      ? <p className="text-muted text-center py-4">No diagnoses recorded.</p>
      : allDiagnoses.map((d, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div className="d-flex justify-content-between mb-1">
              <strong>{d.diagnosis}</strong>
              <small className="text-muted">{formatDate(d.date)} · {d.doctor}</small>
            </div>
            {d.notes && <p style={{ margin: 0, fontSize: 13.5, color: '#374151' }}>{d.notes}</p>}
          </div>
        ))
  );

  const renderPrescriptions = () => (
    prescriptions.length === 0
      ? <p className="text-muted text-center py-4">No prescriptions recorded.</p>
      : prescriptions.map((rx) => (
          <div key={rx._id} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div className="d-flex justify-content-between mb-2">
              <strong>{rx.diagnosis || 'Prescription'}</strong>
              <small className="text-muted">{formatDate(rx.prescriptionDate)} · {rx.doctorId?.fullName}</small>
            </div>
            <div className="table-responsive">
              <table className="hospital-table" style={{ marginBottom: 0 }}>
                <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
                <tbody>
                  {rx.medicines.map((m, i) => (
                    <tr key={i}>
                      <td><strong>{m.medicineName}</strong></td>
                      <td>{m.dosage ?? '—'}</td>
                      <td>{m.frequency ?? '—'}</td>
                      <td>{m.duration ?? '—'}</td>
                      <td>{m.instructions ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
  );

  const renderLabReports = () => (
    labReports.length === 0
      ? <p className="text-muted text-center py-4">No lab reports recorded.</p>
      : <div className="table-responsive">
          <table className="hospital-table">
            <thead><tr><th>Report</th><th>Date</th><th>Result</th><th>Status</th><th>Doctor</th></tr></thead>
            <tbody>
              {labReports.map((l) => (
                <tr key={l._id}>
                  <td><strong>{l.reportName}</strong></td>
                  <td>{l.testDate ? formatDate(l.testDate) : '—'}</td>
                  <td>{l.result ?? '—'}</td>
                  <td>{l.status}</td>
                  <td>{l.doctorId?.fullName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );

  const TAB_CONTENT = {
    'Overview':      renderOverview,
    'Past Visits':   renderPastVisits,
    'Diagnoses':     renderDiagnoses,
    'Prescriptions': renderPrescriptions,
    'Lab Reports':   renderLabReports,
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div
        className="modal-custom"
        style={{ maxWidth: 800, width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-custom-header">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <h5 className="modal-custom-title mb-0">Medical History</h5>
              <small className="text-muted">{patient?.fullName ?? patientName}</small>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0 22px', background: '#fafafa' }}>
          <div className="d-flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '12px 16px',
                  fontSize: 13.5, fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? '#2563eb' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 22, maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <>
              {error && (
                <div className="alert alert-warning py-2 px-3 mb-3" style={{ borderRadius: 10, fontSize: 13 }}>
                  <i className="bi bi-exclamation-triangle me-2" />{error}
                </div>
              )}
              {(TAB_CONTENT[activeTab] ?? (() => null))()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-custom-footer">
          <small className="text-muted me-auto">
            {medicalRecords.length} medical record{medicalRecords.length !== 1 ? 's' : ''} found
          </small>
          <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PatientHistoryModal;
