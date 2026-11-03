import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout          from '../components/DashboardLayout.jsx';
import AppointmentDetailModal   from '../components/AppointmentDetailModal.jsx';
import RejectModal              from '../components/RejectModal.jsx';
import Pagination               from '../components/Pagination.jsx';
import { useToast }             from '../components/Toast.jsx';
import useDebounce              from '../hooks/useDebounce.js';
import usePagination            from '../hooks/usePagination.js';
import api                      from '../api/axios.js';
import patientsApi              from '../api/patients.js';

// ── Constants ────────────────────────────────────────────
const SIDEBAR_LINKS = [
  { label: 'Dashboard',       icon: 'bi-speedometer2',   section: 'overview'      },
  { label: 'Appointments',    icon: 'bi-calendar-check', section: 'appointments'  },
  { label: 'Patients',        icon: 'bi-people',         section: 'patients'      },
  { label: 'Medical Records', icon: 'bi-file-medical',   section: 'records'       },
  { label: 'Settings',        icon: 'bi-gear',           section: 'settings'      },
];

const STATUS_FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected'];

const STATUS_CFG = {
  pending:   { cls: 'badge-pending',   label: 'Pending'   },
  approved:  { cls: 'badge-active',    label: 'Approved'  },
  rejected:  { cls: 'badge-cancelled', label: 'Rejected'  },
  completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-inactive',  label: 'Cancelled' },
};

// ── Sub-components ───────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? { cls: 'badge-inactive', label: status };
  return <span className={`badge-status ${cfg.cls}`}>{cfg.label}</span>;
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className="stat-card-icon" style={{ background: color + '20', color }}>{icon}</div>
    <div>
      <div className="stat-card-value">{value ?? '—'}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────
export default function DoctorDashboard() {
  const toast = useToast();

  // Section state
  const [section, setSection] = useState('overview');

  // Stats
  const [stats,        setStats]        = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [profile,      setProfile]      = useState(null);

  // Appointments
  const [appointments,    setAppointments]    = useState([]);
  const [apptLoading,     setApptLoading]     = useState(true);
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [searchTerm,      setSearchTerm]      = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modals
  const [detailAppt,    setDetailAppt]    = useState(null);  // AppointmentDetailModal
  const [rejectAppt,    setRejectAppt]    = useState(null);  // RejectModal
  const [actionLoading, setActionLoading] = useState(false);

  // Medical record form
  const [recordForm,   setRecordForm]   = useState({ patientId: '', diagnosis: '', treatmentPlan: '', prescription: [{ medicineName: '', dosage: '', duration: '' }], doctorNotes: '' });
  const [recordPatientQuery, setRecordPatientQuery] = useState('');
  const [recordPatientResults, setRecordPatientResults] = useState([]);
  const [recordSelectedPatient, setRecordSelectedPatient] = useState(null);
  const [recordSaving, setRecordSaving] = useState(false);

  // ── Data fetching ──────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/doctor');
      setStats(data.stats);
      setUpcomingSchedule(data.upcomingSchedule ?? []);
    } catch {
      /* non-critical */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data.user);
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments ?? []);
    } catch {
      toast('Could not load appointments', 'error');
    } finally {
      setApptLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchAppointments(); fetchProfile(); }, []);

  // ── Patient search for the "Create Medical Record" form ────
  const debouncedRecordPatientQuery = useDebounce(recordPatientQuery, 300);
  useEffect(() => {
    if (!debouncedRecordPatientQuery.trim()) { setRecordPatientResults([]); return; }
    let cancelled = false;
    patientsApi.search(debouncedRecordPatientQuery.trim())
      .then(({ data }) => { if (!cancelled) setRecordPatientResults(data.patients ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedRecordPatientQuery]);

  // ── Online presence heartbeat ───────────────────────────
  // Keeps this doctor's isOnline/lastActiveAt current while the dashboard
  // tab is open. See DOCTOR_ONLINE_TIMEOUT_MINUTES on the backend for how
  // long a doctor can go quiet before being auto-marked offline.
  useEffect(() => {
    const sendHeartbeat = () => { api.post('/auth/heartbeat').catch(() => {}); };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Filtering ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = appointments;
    if (statusFilter !== 'all')   list = list.filter((a) => a.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((a) =>
        a.patientName?.toLowerCase().includes(q) ||
        a.complaint?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, statusFilter, debouncedSearch]);

  const pendingCount  = appointments.filter((a) => a.status === 'pending').length;
  const { page, totalPages, paginated, setPage } = usePagination(filtered, 8);

  // ── Appointment actions ────────────────────────────────
  const updateLocal = (id, patch) =>
    setAppointments((prev) => prev.map((a) => (a._id === id ? { ...a, ...patch } : a)));

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/appointments/${detailAppt._id}/approve`);
      updateLocal(detailAppt._id, data.appointment);
      toast('Appointment approved ✓', 'success');
      setDetailAppt(null);
      fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not approve appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOpen = () => {
    setRejectAppt(detailAppt);
    setDetailAppt(null);
  };

  const handleRejectConfirm = async ({ rejectionReasonType, rejectionReason }) => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/appointments/${rejectAppt._id}/reject`, {
        rejectionReasonType,
        rejectionReason,
      });
      updateLocal(rejectAppt._id, data.appointment);
      toast('Appointment rejected', 'info');
      setRejectAppt(null);
      fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not reject appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (notes) => {
    setActionLoading(true);
    try {
      const { data } = await api.patch(`/appointments/${detailAppt._id}/complete`, { notes });
      updateLocal(detailAppt._id, data.appointment);
      toast('Appointment marked as completed ✓', 'success');
      setDetailAppt(null);
      fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not complete appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Medical record submit ──────────────────────────────
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!recordSelectedPatient) { toast('Please select a registered patient', 'error'); return; }
    setRecordSaving(true);
    try {
      const { data } = await api.post('/medical-records', {
        patientId: recordSelectedPatient._id,
        diagnosis: recordForm.diagnosis,
        treatmentPlan: recordForm.treatmentPlan,
        doctorNotes: recordForm.doctorNotes,
      });

      const medicines = recordForm.prescription
        .filter((rx) => rx.medicineName.trim())
        .map((rx) => ({ ...rx, medicineName: rx.medicineName.trim() }));
      if (medicines.length > 0) {
        await api.post('/prescriptions', {
          patientId: recordSelectedPatient._id,
          medicalRecordId: data.record._id,
          diagnosis: recordForm.diagnosis,
          medicines,
        });
      }

      toast('Medical record saved ✓', 'success');
      setRecordForm({ patientId: '', diagnosis: '', treatmentPlan: '', prescription: [{ medicineName: '', dosage: '', duration: '' }], doctorNotes: '' });
      setRecordSelectedPatient(null);
      setRecordPatientQuery('');
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not save record', 'error');
    } finally {
      setRecordSaving(false);
    }
  };

  // ── PAGE TITLES ────────────────────────────────────────
  const PAGE_TITLES = {
    overview:     'Doctor Dashboard',
    appointments: 'My Appointments',
    patients:     'Assigned Patients',
    records:      'Medical Records',
    settings:     'Settings',
  };

  // ════════════════════════════════════════════════════════
  // SECTION: OVERVIEW
  // ════════════════════════════════════════════════════════
  const renderOverview = () => (
    <>
      {/* Department / Specialization header */}
      {(stats?.department || stats?.specialization) && (
        <div className="content-card mb-4">
          <div className="content-card-body d-flex flex-wrap gap-4 align-items-center">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Department</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{stats?.department ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Specialization</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{stats?.specialization ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Availability</div>
              <span className="badge-status badge-active">{stats?.availabilityStatus ?? 'Available'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="row g-3 mb-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="col-sm-6 col-xl-3">
                <div className="stat-card"><div className="placeholder-glow w-100"><span className="placeholder col-12" style={{ height: 60, borderRadius: 10 }} /></div></div>
              </div>
            ))
          : [
              { icon: '📅', label: "Today's Appointments",   value: stats?.todaysAppointments,    color: '#2563eb' },
              { icon: '✅', label: 'Completed',              value: stats?.completedAppointments, color: '#059669' },
              { icon: '⏳', label: 'Pending Review',         value: stats?.pendingAppointments,   color: '#d97706' },
              { icon: '🩺', label: 'Active Patients',        value: stats?.assignedPatients,      color: '#7c3aed' },
            ].map((s, i) => (
              <div key={i} className="col-sm-6 col-xl-3">
                <StatCard {...s} />
              </div>
            ))
        }
      </div>

      {/* Pending appointments — quick action list */}
      <div className="content-card">
        <div className="content-card-header">
          <h6 className="content-card-title">
            Pending Review
            {pendingCount > 0 && (
              <span style={{ marginLeft: 8, background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
                {pendingCount}
              </span>
            )}
          </h6>
          <button className="btn btn-sm btn-primary" style={{ borderRadius: 8 }} onClick={() => setSection('appointments')}>
            View All
          </button>
        </div>
        {apptLoading
          ? <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
          : appointments.filter((a) => a.status === 'pending').length === 0
            ? <p className="text-muted text-center py-4 mb-0">No pending appointments 🎉</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Complaint</th><th>Actions</th></tr></thead>
                  <tbody>
                    {appointments.filter((a) => a.status === 'pending').slice(0, 5).map((a) => (
                      <tr key={a._id}>
                        <td><strong>{a.patientName}</strong></td>
                        <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                        <td>{a.timeSlot}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.complaint ?? '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" style={{ borderRadius: 6 }} onClick={() => setDetailAppt(a)}>
                            <i className="bi bi-eye me-1" />Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Upcoming schedule */}
      <div className="content-card mt-4">
        <div className="content-card-header">
          <h6 className="content-card-title">Upcoming Schedule</h6>
        </div>
        {upcomingSchedule.length === 0
          ? <p className="text-muted text-center py-4 mb-0">No upcoming appointments scheduled.</p>
          : (
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {upcomingSchedule.map((a) => (
                    <tr key={a._id}>
                      <td><strong>{a.patientName}</strong></td>
                      <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                      <td>{a.timeSlot}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: APPOINTMENTS
  // ════════════════════════════════════════════════════════
  const renderAppointments = () => (
    <>
      {/* Toolbar */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box flex-grow-1" style={{ maxWidth: 280 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search patient or complaint…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="d-flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ borderRadius: 8, textTransform: 'capitalize' }}
              onClick={() => { setStatusFilter(f); setPage(1); }}>
              {f}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }} onClick={fetchAppointments}>
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      <div className="content-card">
        {apptLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : paginated.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No appointments match your filters.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead>
                    <tr><th>Patient</th><th>Date</th><th>Time</th><th>Complaint</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {paginated.map((a) => (
                      <tr key={a._id}>
                        <td>
                          <strong>{a.patientName}</strong>
                          {a.patientAge && <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.patientAge} yrs · {a.patientBloodGroup ?? ''}</div>}
                        </td>
                        <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                        <td>{a.timeSlot}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.complaint ?? '—'}</td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 6 }} onClick={() => setDetailAppt(a)}>
                              <i className="bi bi-eye" />
                            </button>
                            {a.status === 'pending' && (
                              <>
                                <button className="btn btn-sm btn-success" style={{ borderRadius: 6 }}
                                  onClick={async () => { setDetailAppt(a); }}>
                                  Review
                                </button>
                              </>
                            )}
                            {a.status === 'rejected' && (
                              <span style={{ fontSize: 12, color: '#991b1b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={a.rejectionReason}>
                                {a.rejectionReasonType}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
        <div style={{ padding: '8px 16px 16px' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} total={filtered.length} perPage={8} />
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: PATIENTS
  // ════════════════════════════════════════════════════════
  const renderPatients = () => {
    const patientMap = {};
    appointments.forEach((a) => {
      if (!patientMap[a.patientPhone ?? a.patientName]) {
        patientMap[a.patientPhone ?? a.patientName] = {
          name:       a.patientName,
          age:        a.patientAge,
          phone:      a.patientPhone,
          bloodGroup: a.patientBloodGroup,
          gender:     a.patientGender,
          visits:     0,
          last:       a.date,
        };
      }
      patientMap[a.patientPhone ?? a.patientName].visits += 1;
    });
    const patients = Object.values(patientMap);

    return (
      <div className="content-card">
        <div className="content-card-header">
          <h6 className="content-card-title">Assigned Patients ({patients.length})</h6>
        </div>
        {patients.length === 0
          ? <p className="text-muted text-center py-5 mb-0">No patients assigned yet.</p>
          : (
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th>Blood Group</th><th>Visits</th><th>Last Seen</th></tr></thead>
                <tbody>
                  {patients.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.age ? `${p.age} yrs` : '—'}</td>
                      <td>{p.phone ?? '—'}</td>
                      <td>{p.bloodGroup ? <span className="badge bg-danger">{p.bloodGroup}</span> : '—'}</td>
                      <td>{p.visits}</td>
                      <td>{p.last ? new Date(p.last).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    );
  };

  // ════════════════════════════════════════════════════════
  // SECTION: MEDICAL RECORDS
  // ════════════════════════════════════════════════════════
  const renderRecords = () => (
    <div className="content-card" style={{ maxWidth: 680 }}>
      <div className="content-card-header">
        <h6 className="content-card-title">Create Medical Record</h6>
      </div>
      <div className="content-card-body">
        <form onSubmit={handleSaveRecord}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Patient *</label>
              {!recordSelectedPatient ? (
                <>
                  <input className="form-control" style={{ borderRadius: 10 }}
                    placeholder="Search registered patient by name, phone, or ID…"
                    value={recordPatientQuery}
                    onChange={(e) => setRecordPatientQuery(e.target.value)} />
                  {recordPatientResults.length > 0 && (
                    <div className="d-flex flex-column gap-1 mt-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {recordPatientResults.map((p) => (
                        <button key={p._id} type="button"
                          className="d-flex justify-content-between align-items-center"
                          style={{ border: '1px solid #e2e4f0', borderRadius: 8, padding: '8px 12px', background: '#fafaff', textAlign: 'left' }}
                          onClick={() => { setRecordSelectedPatient(p); setRecordPatientResults([]); setRecordPatientQuery(''); }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.fullName}</span>
                          <span className="text-muted" style={{ fontSize: 12 }}>{p.patientId} · {p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="d-flex justify-content-between align-items-center" style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{recordSelectedPatient.fullName} — {recordSelectedPatient.patientId}</span>
                  <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setRecordSelectedPatient(null)}>Change</button>
                </div>
              )}
            </div>
            <div className="col-12">
              <label className="form-label">Diagnosis</label>
              <input className="form-control" style={{ borderRadius: 10 }}
                placeholder="Primary diagnosis"
                value={recordForm.diagnosis}
                onChange={(e) => setRecordForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">Treatment Plan</label>
              <input className="form-control" style={{ borderRadius: 10 }}
                placeholder="e.g. Rest, hydration, follow-up in 1 week"
                value={recordForm.treatmentPlan}
                onChange={(e) => setRecordForm((p) => ({ ...p, treatmentPlan: e.target.value }))} />
            </div>

            {/* Prescriptions */}
            <div className="col-12">
              <label className="form-label">Prescriptions</label>
              {recordForm.prescription.map((rx, i) => (
                <div key={i} className="row g-2 mb-2">
                  {['medicineName', 'dosage', 'duration'].map((field) => (
                    <div key={field} className="col">
                      <input className="form-control form-control-sm" style={{ borderRadius: 8 }}
                        placeholder={field === 'medicineName' ? 'Medicine' : field.charAt(0).toUpperCase() + field.slice(1)}
                        value={rx[field]}
                        onChange={(e) => {
                          const updated = [...recordForm.prescription];
                          updated[i] = { ...updated[i], [field]: e.target.value };
                          setRecordForm((p) => ({ ...p, prescription: updated }));
                        }} />
                    </div>
                  ))}
                  <div className="col-auto">
                    <button type="button" className="btn btn-sm btn-outline-danger" style={{ borderRadius: 8 }}
                      onClick={() => setRecordForm((p) => ({ ...p, prescription: p.prescription.filter((_, j) => j !== i) }))}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8 }}
                onClick={() => setRecordForm((p) => ({ ...p, prescription: [...p.prescription, { medicineName: '', dosage: '', duration: '' }] }))}>
                <i className="bi bi-plus me-1" />Add Medicine
              </button>
            </div>

            <div className="col-12">
              <label className="form-label">Doctor's Notes</label>
              <textarea rows={3} className="form-control" style={{ borderRadius: 10, resize: 'vertical' }}
                placeholder="Observations, treatment plan…"
                value={recordForm.doctorNotes}
                onChange={(e) => setRecordForm((p) => ({ ...p, doctorNotes: e.target.value }))} />
            </div>
          </div>
          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-success" style={{ borderRadius: 8 }} disabled={recordSaving}>
              {recordSaving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-floppy me-1" />}
              Save Record
            </button>
            <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }}
              onClick={() => { setRecordForm({ patientId: '', diagnosis: '', treatmentPlan: '', prescription: [{ medicineName: '', dosage: '', duration: '' }], doctorNotes: '' }); setRecordSelectedPatient(null); }}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  // SECTION: SETTINGS
  // ════════════════════════════════════════════════════════
  const renderSettings = () => {
    const name  = localStorage.getItem('name')  ?? '';
    const email = localStorage.getItem('email') ?? '';
    const fields = [
      ['Full Name', name],
      ['Email', email],
      ['Phone', profile?.phone || '—'],
      ['Department', profile?.department || '—'],
      ['Specialization', profile?.specialization || '—'],
      ['Qualification', profile?.qualification || '—'],
      ['Experience', profile?.experience != null ? `${profile.experience} yrs` : '—'],
      ['Consultation Fee', profile?.consultationFee != null ? `₹${profile.consultationFee}` : '—'],
    ];
    return (
      <div className="content-card" style={{ maxWidth: 560 }}>
        <div className="content-card-header"><h6 className="content-card-title">Account Information</h6></div>
        <div className="content-card-body">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>
              {name.charAt(0)}
            </div>
            <div>
              <h5 className="mb-1">{name}</h5>
              <span className="navbar-role-badge role-doctor">Doctor</span>
              {profile?.availabilityStatus && (
                <span className="badge-status badge-active ms-2">{profile.availabilityStatus}</span>
              )}
              <span className="ms-2" style={{ fontSize: 13 }}>
                {profile?.isOnline ? '🟢 Online' : '⚪ Offline'}
              </span>
            </div>
          </div>
          {fields.map(([label, val]) => (
            <div className="mb-3" key={label}>
              <label className="form-label">{label}</label>
              <input className="form-control" value={val} readOnly style={{ borderRadius: 10, background: '#f8fafc' }} />
            </div>
          ))}
          <p className="text-muted mb-3" style={{ fontSize: 12.5 }}>
            <i className="bi bi-info-circle me-1" />
            Profile details are managed by your administrator. Contact them to request changes.
          </p>
          <hr />
          <h6 className="content-card-title mb-2">Change Password</h6>
          <a href="/change-password" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 8 }}>
            <i className="bi bi-key me-1" />Change Password
          </a>
        </div>
      </div>
    );
  };

  const SECTIONS = { overview: renderOverview, appointments: renderAppointments, patients: renderPatients, records: renderRecords, settings: renderSettings };

  // Inject pending badge on sidebar
  const linksWithBadge = SIDEBAR_LINKS.map((l) =>
    l.section === 'appointments' ? { ...l, badge: pendingCount } : l
  );

  return (
    <>
      <DashboardLayout
        sidebarLinks={linksWithBadge}
        activeSection={section}
        onSection={(s) => { setSection(s); setSearchTerm(''); setStatusFilter('all'); }}
        pageTitle={PAGE_TITLES[section]}
      >
        <p className="section-subheading">
          {section === 'overview' ? "Here's your schedule and patient overview." : `Manage your ${section}`}
        </p>
        {(SECTIONS[section] ?? renderOverview)()}
      </DashboardLayout>

      {/* Appointment detail modal */}
      {detailAppt && (
        <AppointmentDetailModal
          appointment={detailAppt}
          onApprove={handleApprove}
          onReject={handleRejectOpen}
          onComplete={handleComplete}
          onClose={() => setDetailAppt(null)}
          loading={actionLoading}
        />
      )}

      {/* Rejection reason modal */}
      {rejectAppt && (
        <RejectModal
          appointment={rejectAppt}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectAppt(null)}
          loading={actionLoading}
        />
      )}
    </>
  );
}
