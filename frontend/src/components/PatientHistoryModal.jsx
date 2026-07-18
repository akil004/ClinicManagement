import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';

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
 * PatientHistoryModal — complete patient medical history viewer.
 *
 * Props:
 *   patientPhone  string   used to fetch history
 *   patientName   string   displayed in header
 *   onClose       fn()
 */
const PatientHistoryModal = ({ patientPhone, patientName, onClose }) => {
  const [activeTab, setActiveTab]   = useState('Overview');
  const [history,   setHistory]     = useState(null);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState('');

  useEffect(() => {
    if (!patientPhone) { setLoading(false); return; }

    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/medical-records/patient/${encodeURIComponent(patientPhone)}`);
        setHistory(data);
      } catch {
        // Fall back to empty history structure
        setHistory({ patientInfo: null, records: [], allAllergies: [], allChronicDiseases: [], allSurgeries: [] });
        setError('Could not load medical records from server — showing empty history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientPhone]);

  const info    = history?.patientInfo;
  const records = history?.records ?? [];

  // Flatten prescriptions and lab reports across all records
  const allPrescriptions = records.flatMap((r) => (r.prescription ?? []).map((p) => ({ ...p, date: r.createdAt, doctor: r.doctorName })));
  const allLabReports    = records.flatMap((r) => (r.labReports   ?? []).map((l) => ({ ...l, doctor: r.doctorName })));
  const allDiagnoses     = records.filter((r) => r.diagnosis).map((r) => ({ diagnosis: r.diagnosis, notes: r.doctorNotes, date: r.createdAt, doctor: r.doctorName }));

  const renderOverview = () => (
    <div className="row g-4">
      <div className="col-md-6">
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
            <i className="bi bi-person-circle me-2 text-primary" />Patient Information
          </h6>
          <InfoRow label="Full Name"   value={info?.name       ?? patientName} />
          <InfoRow label="Age"         value={info?.age ? `${info.age} years` : undefined} />
          <InfoRow label="Gender"      value={info?.gender} />
          <InfoRow label="Blood Group" value={info?.bloodGroup} />
          <InfoRow label="Phone"       value={info?.phone ?? patientPhone} />
        </div>
      </div>
      <div className="col-md-6">
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <h6 style={{ fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
            <i className="bi bi-heart-pulse me-2 text-danger" />Health Summary
          </h6>
          <div className="mb-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Allergies</div>
            <TagList items={history?.allAllergies ?? []} color="#fee2e2" textColor="#991b1b" />
          </div>
          <div className="mb-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Chronic Diseases</div>
            <TagList items={history?.allChronicDiseases ?? []} color="#fef3c7" textColor="#92400e" />
          </div>
        </div>
      </div>
      {info?.emergency && (
        <div className="col-12">
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 18, border: '1px solid #bbf7d0' }}>
            <h6 style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>
              <i className="bi bi-telephone-fill me-2" />Emergency Contact
            </h6>
            <div className="d-flex gap-4 flex-wrap">
              <InfoRow label="Name"     value={info.emergency.name} />
              <InfoRow label="Phone"    value={info.emergency.phone} />
              <InfoRow label="Relation" value={info.emergency.relation} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPastVisits = () => (
    records.length === 0
      ? <p className="text-muted text-center py-4">No past visit records found.</p>
      : <div className="table-responsive">
          <table className="hospital-table">
            <thead>
              <tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{r.doctorName ?? '—'}</td>
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
              <small className="text-muted">{new Date(d.date).toLocaleDateString('en-IN')} · {d.doctor}</small>
            </div>
            {d.notes && <p style={{ margin: 0, fontSize: 13.5, color: '#374151' }}>{d.notes}</p>}
          </div>
        ))
  );

  const renderPrescriptions = () => (
    allPrescriptions.length === 0
      ? <p className="text-muted text-center py-4">No prescriptions recorded.</p>
      : <div className="table-responsive">
          <table className="hospital-table">
            <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Notes</th><th>Date</th><th>Doctor</th></tr></thead>
            <tbody>
              {allPrescriptions.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.medicine}</strong></td>
                  <td>{p.dosage ?? '—'}</td>
                  <td>{p.duration ?? '—'}</td>
                  <td>{p.notes ?? '—'}</td>
                  <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                  <td>{p.doctor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );

  const renderLabReports = () => (
    allLabReports.length === 0
      ? <p className="text-muted text-center py-4">No lab reports recorded.</p>
      : <div className="table-responsive">
          <table className="hospital-table">
            <thead><tr><th>Report</th><th>Date</th><th>Result</th><th>Doctor</th></tr></thead>
            <tbody>
              {allLabReports.map((l, i) => (
                <tr key={i}>
                  <td><strong>{l.name}</strong></td>
                  <td>{l.date ? new Date(l.date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>{l.result ?? '—'}</td>
                  <td>{l.doctor}</td>
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
              <small className="text-muted">{patientName}</small>
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
            {records.length} medical record{records.length !== 1 ? 's' : ''} found
          </small>
          <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PatientHistoryModal;
