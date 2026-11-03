import React, { useState, useEffect, useCallback } from 'react';
import Modal        from './Modal.jsx';
import Pagination   from './Pagination.jsx';
import { useToast } from './Toast.jsx';
import useDebounce   from '../hooks/useDebounce.js';
import patientsApi   from '../api/patients.js';
import { formatDate, formatDateTime } from '../utils/dateHelper.js';
import { PATIENT_STATUS } from '../constants/index.js';

const EMPTY_PATIENT = {
  fullName: '', dateOfBirth: '', age: '', gender: '', bloodGroup: '', phone: '', email: '',
  address: '', allergiesText: '', chronicDiseasesText: '', pastMedicalHistory: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
};

const STATUS_BADGE = {
  [PATIENT_STATUS.PENDING]:    { cls: 'badge-pending',   label: 'Pending' },
  [PATIENT_STATUS.REGISTERED]: { cls: 'badge-active',    label: 'Registered' },
  [PATIENT_STATUS.REJECTED]:   { cls: 'badge-cancelled', label: 'Rejected' },
};
const PatientStatusBadge = ({ status }) => {
  const c = STATUS_BADGE[status] ?? { cls: 'badge-inactive', label: status };
  return <span className={`badge-status ${c.cls}`}>{c.label}</span>;
};

/**
 * PatientRegistry — Pending Registrations / Registered Patients / Rejected
 * tabs, shared by Administrator and Receptionist dashboards (both roles
 * have the same registration-management permissions). Registration is
 * intentionally kept separate from appointment booking here — creating a
 * patient never books an appointment.
 *
 * @param {'pending'|'registered'|'rejected'} initialTab
 */
export default function PatientRegistry({ initialTab = 'pending' }) {
  const toast = useToast();

  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const [patients, setPatients]   = useState([]);
  const [meta, setMeta]           = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [modal, setModal]         = useState(null); // 'register' | 'view' | 'reject'
  const [form, setForm]           = useState(EMPTY_PATIENT);
  const [activePatient, setActivePatient] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: debouncedSearch || undefined, page, limit: 10 };
      const { data } = tab === 'pending'
        ? await patientsApi.getPending(params)
        : tab === 'registered'
          ? await patientsApi.getRegistered(params)
          : await patientsApi.getRejected(params);
      setPatients(data.patients ?? []);
      setMeta({ page: data.page ?? 1, totalPages: data.totalPages ?? 1, total: data.total ?? 0 });
    } catch {
      toast('Could not load patients', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);
  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // ── Register new patient ────────────────────────────────
  const openRegisterModal = () => { setForm(EMPTY_PATIENT); setModal('register'); };

  const submitRegistration = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      toast('Full name and phone are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        allergies: form.allergiesText ? form.allergiesText.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronicDiseases: form.chronicDiseasesText ? form.chronicDiseasesText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      delete payload.allergiesText;
      delete payload.chronicDiseasesText;
      await patientsApi.create(payload);
      toast('Patient registered — pending approval ✓', 'success');
      setModal(null);
      setTab('pending');
      fetchPatients();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not register patient', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── View ─────────────────────────────────────────────────
  const openView = async (patient) => {
    setActivePatient(patient);
    setModal('view');
    try {
      const { data } = await patientsApi.getOne(patient._id);
      setActivePatient(data.patient);
    } catch { /* keep list-row data as fallback */ }
  };

  // ── Approve ──────────────────────────────────────────────
  const approve = async (patient) => {
    try {
      await patientsApi.approve(patient._id);
      toast(`${patient.fullName} approved and moved to Registered Patients ✓`, 'success');
      fetchPatients();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not approve registration', 'error');
    }
  };

  // ── Reject ───────────────────────────────────────────────
  const openReject = (patient) => { setActivePatient(patient); setRejectionReason(''); setModal('reject'); };
  const submitReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) { toast('A rejection reason is required', 'error'); return; }
    setSaving(true);
    try {
      await patientsApi.reject(activePatient._id, rejectionReason.trim());
      toast('Registration rejected', 'success');
      setModal(null);
      fetchPatients();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not reject registration', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-card">
      <div className="content-card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="btn-group" role="group">
          {[
            ['pending', 'Pending Registrations'],
            ['registered', 'Registered Patients'],
            ['rejected', 'Rejected'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setTab(key)}
            >
              {label}{key === 'pending' && meta.total > 0 && tab === 'pending' ? ` (${meta.total})` : ''}
            </button>
          ))}
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            style={{ borderRadius: 8, width: 220 }}
            placeholder="Search name, phone, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-primary btn-sm" style={{ borderRadius: 8 }} onClick={openRegisterModal}>
            <i className="bi bi-plus-lg me-1" />Register Patient
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted px-4 py-4 mb-0">Loading…</p>
      ) : patients.length === 0 ? (
        <p className="text-muted px-4 py-4 mb-0">No {tab} patients found.</p>
      ) : (
        <div className="table-responsive">
          <table className="hospital-table">
            <thead>
              <tr>
                <th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th>
                <th>{tab === 'rejected' ? 'Rejected On' : 'Registration Date'}</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.patientId}</strong></td>
                  <td>{p.fullName}</td>
                  <td>{p.age ?? '—'}</td>
                  <td>{p.gender ?? '—'}</td>
                  <td>{p.phone}</td>
                  <td>{formatDate(tab === 'rejected' ? p.rejectedAt : p.createdAt)}</td>
                  <td><PatientStatusBadge status={p.registrationStatus} /></td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-secondary" title="View" onClick={() => openView(p)}>
                        <i className="bi bi-eye" />
                      </button>
                      {tab === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-outline-success" title="Approve" onClick={() => approve(p)}>
                            <i className="bi bi-check-lg" />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" title="Reject" onClick={() => openReject(p)}>
                            <i className="bi bi-x-lg" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-3 pb-3">
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} perPage={10} onPage={setPage} />
      </div>

      {/* ── Register patient ── */}
      {modal === 'register' && (
        <Modal title="Register New Patient" onClose={() => setModal(null)} wide>
          <form onSubmit={submitRegistration}>
            <div className="modal-custom-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" required value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-control" value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Age</label>
                  <input type="number" min="0" className="form-control" value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Blood Group</label>
                  <select className="form-select" value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone *</label>
                  <input className="form-control" required value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Emergency Contact Name</label>
                  <input className="form-control" value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Emergency Contact Phone</label>
                  <input className="form-control" value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Relationship</label>
                  <input className="form-control" value={form.emergencyContactRelationship}
                    onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Allergies (comma-separated)</label>
                  <input className="form-control" value={form.allergiesText}
                    onChange={(e) => setForm({ ...form, allergiesText: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chronic Diseases (comma-separated)</label>
                  <input className="form-control" value={form.chronicDiseasesText}
                    onChange={(e) => setForm({ ...form, chronicDiseasesText: e.target.value })} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Past Medical History</label>
                  <textarea className="form-control" rows={1} value={form.pastMedicalHistory}
                    onChange={(e) => setForm({ ...form, pastMedicalHistory: e.target.value })} />
                </div>
              </div>
              <p className="text-muted mt-3 mb-0" style={{ fontSize: 13 }}>
                <i className="bi bi-info-circle me-1" />
                This patient will be saved as <strong>Pending</strong> and must be approved before an
                appointment can be booked for them.
              </p>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Register Patient'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View patient ── */}
      {modal === 'view' && activePatient && (
        <Modal title={`Patient: ${activePatient.fullName}`} onClose={() => setModal(null)} wide>
          <div className="modal-custom-body">
            <div className="row g-3">
              {[
                ['Patient ID', activePatient.patientId],
                ['Status', <PatientStatusBadge key="s" status={activePatient.registrationStatus} />],
                ['Age', activePatient.age ?? '—'],
                ['Gender', activePatient.gender ?? '—'],
                ['Blood Group', activePatient.bloodGroup ?? '—'],
                ['Phone', activePatient.phone],
                ['Email', activePatient.email ?? '—'],
                ['Address', activePatient.address ?? '—'],
                ['Registered On', formatDateTime(activePatient.createdAt)],
              ].map(([label, value]) => (
                <div className="col-md-6" key={label}>
                  <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
                  <div>{value}</div>
                </div>
              ))}
              {activePatient.allergies?.length > 0 && (
                <div className="col-12">
                  <div className="text-muted" style={{ fontSize: 12 }}>Allergies</div>
                  <div>{activePatient.allergies.join(', ')}</div>
                </div>
              )}
              {activePatient.chronicDiseases?.length > 0 && (
                <div className="col-12">
                  <div className="text-muted" style={{ fontSize: 12 }}>Chronic Diseases</div>
                  <div>{activePatient.chronicDiseases.join(', ')}</div>
                </div>
              )}
              {activePatient.pastMedicalHistory && (
                <div className="col-12">
                  <div className="text-muted" style={{ fontSize: 12 }}>Past Medical History</div>
                  <div>{activePatient.pastMedicalHistory}</div>
                </div>
              )}
              {activePatient.registrationStatus === PATIENT_STATUS.REJECTED && (
                <div className="col-12">
                  <div className="text-muted" style={{ fontSize: 12 }}>Rejection Reason</div>
                  <div className="text-danger">{activePatient.rejectionReason}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Rejected by {activePatient.rejectedBy?.fullName ?? '—'} on {formatDateTime(activePatient.rejectedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-custom-footer">
            {activePatient.registrationStatus === PATIENT_STATUS.PENDING && (
              <>
                <button className="btn btn-outline-danger" onClick={() => { setModal('reject'); }}>Reject</button>
                <button className="btn btn-success" onClick={async () => { await approve(activePatient); setModal(null); }}>Approve</button>
              </>
            )}
            <button className="btn btn-outline-secondary" onClick={() => setModal(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* ── Reject registration ── */}
      {modal === 'reject' && activePatient && (
        <Modal title={`Reject Registration — ${activePatient.fullName}`} onClose={() => setModal(null)}>
          <form onSubmit={submitReject}>
            <div className="modal-custom-body">
              <label className="form-label">Rejection Reason *</label>
              <textarea className="form-control" rows={3} required value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this registration is being rejected…" />
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving ? 'Rejecting…' : 'Reject Registration'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
