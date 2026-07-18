import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Pagination      from '../components/Pagination.jsx';
import { useToast }    from '../components/Toast.jsx';
import useDebounce     from '../hooks/useDebounce.js';
import usePagination   from '../hooks/usePagination.js';
import api             from '../api/axios.js';

const SIDEBAR_LINKS = [
  { label: 'Dashboard',       icon: 'bi-speedometer2',   section: 'overview'        },
  { label: 'Doctors',         icon: 'bi-person-badge',   section: 'doctors'         },
  { label: 'Receptionists',   icon: 'bi-headset',        section: 'receptionists'   },
  { label: 'Specializations', icon: 'bi-tags',           section: 'specializations' },
  { label: 'Patients',        icon: 'bi-people',         section: 'patients'        },
  { label: 'Appointments',    icon: 'bi-calendar-check', section: 'appointments'    },
  { label: 'Reports',         icon: 'bi-bar-chart-line', section: 'reports'         },
  { label: 'Settings',        icon: 'bi-gear',           section: 'settings'        },
  { label: 'Profile',         icon: 'bi-person-circle',  section: 'profile'         },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const AVAILABILITY_OPTIONS = ['Available', 'Busy', 'On Leave'];

const EMPTY_DOCTOR = {
  fullName: '', email: '', phone: '', department: '', specialization: '', customSpecialization: '',
  qualification: '', experience: '', consultationFee: '', availabilityStatus: 'Available',
  availableDays: [], availableTimeSlotsText: '',
};
const EMPTY_RECEPTIONIST = { fullName: '', email: '', phone: '' };
const EMPTY_SPEC = { name: '', description: '' };

const STATUS_CFG = {
  pending: { cls: 'badge-pending', label: 'Pending' }, approved: { cls: 'badge-active', label: 'Approved' },
  rejected: { cls: 'badge-cancelled', label: 'Rejected' }, completed: { cls: 'badge-completed', label: 'Completed' },
  cancelled: { cls: 'badge-inactive', label: 'Cancelled' },
  Available: { cls: 'badge-active', label: 'Available' }, Busy: { cls: 'badge-pending', label: 'Busy' },
  'On Leave': { cls: 'badge-leave', label: 'On Leave' },
};
const StatusBadge = ({ status }) => { const c = STATUS_CFG[status] ?? { cls: 'badge-inactive', label: status }; return <span className={`badge-status ${c.cls}`}>{c.label}</span>; };
const ActiveBadge = ({ isActive }) => (
  <span className={`badge-status ${isActive ? 'badge-active' : 'badge-inactive'}`}>{isActive ? 'Active' : 'Disabled'}</span>
);
const StatCard = ({ icon, label, value, color, sub }) => (
  <div className="stat-card">
    <div className="stat-card-icon" style={{ background: color + '20', color }}>{icon}</div>
    <div>
      <div className="stat-card-value">{value ?? '—'}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="modal-backdrop-custom" onClick={onClose}>
    <div className="modal-custom" style={{ maxWidth: wide ? 680 : 500 }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-custom-header">
        <h5 className="modal-custom-title">{title}</h5>
        <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      {children}
    </div>
  </div>
);

export default function AdminDashboard() {
  const toast = useToast();
  const [section, setSection]   = useState('overview');
  const [stats,   setStats]     = useState(null);
  const [apptStats, setApptStats] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading]   = useState(false);

  // ── Employee Management state ──────────────────────────
  const [doctors,          setDoctors]          = useState([]);
  const [doctorsTotal,     setDoctorsTotal]     = useState(0);
  const [doctorsLoading,   setDoctorsLoading]   = useState(true);
  const [doctorSearch,     setDoctorSearch]     = useState('');
  const [doctorFilters,    setDoctorFilters]    = useState({ specialization: '', department: '', availabilityStatus: '', status: 'active' });
  const [doctorSort,       setDoctorSort]       = useState({ sortBy: 'name', sortDir: 'asc' });
  const [doctorPage,       setDoctorPage]       = useState(1);
  const debouncedDoctorSearch = useDebounce(doctorSearch, 350);

  const [receptionists,        setReceptionists]        = useState([]);
  const [receptionistsLoading, setReceptionistsLoading] = useState(true);
  const [receptionistSearch,   setReceptionistSearch]   = useState('');
  const debouncedReceptionistSearch = useDebounce(receptionistSearch, 350);

  const [specializations,        setSpecializations]        = useState([]);
  const [specializationsLoading, setSpecializationsLoading] = useState(true);

  // Modal / form state
  const [modal,         setModal]         = useState(null);
  const [doctorForm,     setDoctorForm]     = useState(EMPTY_DOCTOR);
  const [receptionForm,  setReceptionForm]  = useState(EMPTY_RECEPTIONIST);
  const [specForm,       setSpecForm]       = useState(EMPTY_SPEC);
  const [editingId,      setEditingId]      = useState(null);
  const [viewTarget,     setViewTarget]     = useState(null); // { role, employee }
  const [confirmTarget,  setConfirmTarget]  = useState(null); // { type: 'doctor'|'receptionist'|'specialization', id, name }
  const [tempPasswordInfo, setTempPasswordInfo] = useState(null); // { name, password }
  const [saving,         setSaving]         = useState(false);

  // Appointments toolbar filters (reused across overview/appointments/patients)
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [dateRange,     setDateRange]     = useState({ from: '', to: '' });
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ── Fetch: dashboard stats ──────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/admin');
      setStats(data.stats);
      setApptStats({
        rejectionBreakdown: data.rejectionBreakdown,
        doctorStats: data.doctorStats,
        doctorsBySpecialization: data.doctorsBySpecialization,
        appointmentsBySpecialization: data.appointmentsBySpecialization,
        mostRequestedSpecialization: data.mostRequestedSpecialization,
        availabilitySummary: data.availabilitySummary,
      });
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments ?? []);
    } catch { toast('Could not load appointments', 'error'); }
    finally { setApptLoading(false); }
  }, []);

  const fetchSpecializations = useCallback(async () => {
    setSpecializationsLoading(true);
    try {
      const { data } = await api.get('/specializations');
      setSpecializations(data.specializations ?? []);
    } catch { toast('Could not load specializations', 'error'); }
    finally { setSpecializationsLoading(false); }
  }, []);

  const fetchDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const { data } = await api.get('/employees/doctors', {
        params: {
          search: debouncedDoctorSearch || undefined,
          specialization: doctorFilters.specialization || undefined,
          department: doctorFilters.department || undefined,
          availabilityStatus: doctorFilters.availabilityStatus || undefined,
          status: doctorFilters.status,
          sortBy: doctorSort.sortBy,
          sortDir: doctorSort.sortDir,
          page: doctorPage,
          limit: 10,
        },
      });
      setDoctors(data.employees ?? []);
      setDoctorsTotal(data.total ?? 0);
    } catch { toast('Could not load doctors', 'error'); }
    finally { setDoctorsLoading(false); }
  }, [debouncedDoctorSearch, doctorFilters, doctorSort, doctorPage]);

  const fetchReceptionists = useCallback(async () => {
    setReceptionistsLoading(true);
    try {
      const { data } = await api.get('/employees/receptionists', {
        params: { search: debouncedReceptionistSearch || undefined, status: 'all', limit: 100 },
      });
      setReceptionists(data.employees ?? []);
    } catch { toast('Could not load receptionists', 'error'); }
    finally { setReceptionistsLoading(false); }
  }, [debouncedReceptionistSearch]);

  useEffect(() => { fetchStats(); fetchAppointments(); fetchSpecializations(); }, []);
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);
  useEffect(() => { fetchReceptionists(); }, [fetchReceptionists]);

  // ── Filtered appointments (client-side, overview/appointments/patients) ──
  const filteredAppts = useMemo(() => {
    let list = appointments;
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((a) => a.patientName?.toLowerCase().includes(q) || a.doctorName?.toLowerCase().includes(q));
    }
    if (dateRange.from) list = list.filter((a) => new Date(a.date) >= new Date(dateRange.from));
    if (dateRange.to)   list = list.filter((a) => new Date(a.date) <= new Date(dateRange.to + 'T23:59:59'));
    return list;
  }, [appointments, statusFilter, debouncedSearch, dateRange]);

  const apptPag = usePagination(filteredAppts, 10);

  // ════════════════════════════════════════════════════════
  // DOCTOR CRUD
  // ════════════════════════════════════════════════════════
  const openAddDoctor = () => { setDoctorForm(EMPTY_DOCTOR); setEditingId(null); setModal('doctorForm'); };

  const openEditDoctor = (d) => {
    setDoctorForm({
      fullName: d.fullName ?? '', email: d.email ?? '', phone: d.phone ?? '',
      department: d.department ?? '', specialization: d.specialization ?? '', customSpecialization: '',
      qualification: d.qualification ?? '', experience: d.experience ?? '', consultationFee: d.consultationFee ?? '',
      availabilityStatus: d.availabilityStatus ?? 'Available',
      availableDays: d.availableDays ?? [],
      availableTimeSlotsText: (d.availableTimeSlots ?? []).join(', '),
    });
    setEditingId(d._id);
    setModal('doctorForm');
  };

  const toggleDoctorDay = (day) => {
    setDoctorForm((p) => ({
      ...p,
      availableDays: p.availableDays.includes(day) ? p.availableDays.filter((d) => d !== day) : [...p.availableDays, day],
    }));
  };

  const submitDoctorForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const specialization = doctorForm.specialization === 'Other'
        ? doctorForm.customSpecialization.trim()
        : doctorForm.specialization;

      if (!specialization) { toast('Please select or enter a specialization', 'error'); setSaving(false); return; }

      const payload = {
        fullName: doctorForm.fullName, email: doctorForm.email, phone: doctorForm.phone,
        department: doctorForm.department, specialization,
        qualification: doctorForm.qualification,
        experience: doctorForm.experience === '' ? undefined : Number(doctorForm.experience),
        consultationFee: doctorForm.consultationFee === '' ? undefined : Number(doctorForm.consultationFee),
        availabilityStatus: doctorForm.availabilityStatus,
        availableDays: doctorForm.availableDays,
        availableTimeSlots: doctorForm.availableTimeSlotsText
          .split(',').map((s) => s.trim()).filter(Boolean),
      };

      if (editingId) {
        await api.put(`/employees/doctors/${editingId}`, payload);
        toast('Doctor updated ✓', 'success');
        setModal(null);
      } else {
        const { data } = await api.post('/employees/doctors', payload);
        setModal(null);
        setTempPasswordInfo({ name: data.employee.fullName, password: data.temporaryPassword, role: 'Doctor' });
      }
      setDoctorForm(EMPTY_DOCTOR); setEditingId(null);
      fetchDoctors(); fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not save doctor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDoctorActive = async (d) => {
    try {
      const { data } = await api.patch(`/employees/doctors/${d._id}/disable`, { isActive: !d.isActive });
      setDoctors((prev) => prev.map((x) => x._id === d._id ? data.employee : x));
      toast(data.message, 'info');
    } catch (err) { toast(err.response?.data?.message ?? 'Action failed', 'error'); }
  };

  const resetDoctorPassword = async (d) => {
    try {
      const { data } = await api.patch(`/employees/doctors/${d._id}/reset-password`);
      setTempPasswordInfo({ name: d.fullName, password: data.temporaryPassword, role: 'Doctor' });
    } catch (err) { toast(err.response?.data?.message ?? 'Could not reset password', 'error'); }
  };

  // ════════════════════════════════════════════════════════
  // RECEPTIONIST CRUD
  // ════════════════════════════════════════════════════════
  const openAddReceptionist = () => { setReceptionForm(EMPTY_RECEPTIONIST); setEditingId(null); setModal('receptionForm'); };
  const openEditReceptionist = (r) => {
    setReceptionForm({ fullName: r.fullName ?? '', email: r.email ?? '', phone: r.phone ?? '' });
    setEditingId(r._id);
    setModal('receptionForm');
  };

  const submitReceptionForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/employees/receptionists/${editingId}`, receptionForm);
        toast('Receptionist updated ✓', 'success');
        setModal(null);
      } else {
        const { data } = await api.post('/employees/receptionists', receptionForm);
        setModal(null);
        setTempPasswordInfo({ name: data.employee.fullName, password: data.temporaryPassword, role: 'Receptionist' });
      }
      setReceptionForm(EMPTY_RECEPTIONIST); setEditingId(null);
      fetchReceptionists(); fetchStats();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not save receptionist', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleReceptionistActive = async (r) => {
    try {
      const { data } = await api.patch(`/employees/receptionists/${r._id}/disable`, { isActive: !r.isActive });
      setReceptionists((prev) => prev.map((x) => x._id === r._id ? data.employee : x));
      toast(data.message, 'info');
    } catch (err) { toast(err.response?.data?.message ?? 'Action failed', 'error'); }
  };

  const resetReceptionistPassword = async (r) => {
    try {
      const { data } = await api.patch(`/employees/receptionists/${r._id}/reset-password`);
      setTempPasswordInfo({ name: r.fullName, password: data.temporaryPassword, role: 'Receptionist' });
    } catch (err) { toast(err.response?.data?.message ?? 'Could not reset password', 'error'); }
  };

  // ── Generic delete confirm (doctor / receptionist / specialization) ────
  const confirmDelete = async () => {
    const { type, id, name } = confirmTarget;
    try {
      if (type === 'doctor')          await api.delete(`/employees/doctors/${id}`);
      if (type === 'receptionist')     await api.delete(`/employees/receptionists/${id}`);
      if (type === 'specialization')  await api.delete(`/specializations/${id}`);
      toast(`${name} removed`, 'info');
      setModal(null); setConfirmTarget(null);
      if (type === 'doctor')          { fetchDoctors(); fetchStats(); }
      if (type === 'receptionist')     fetchReceptionists();
      if (type === 'specialization')  fetchSpecializations();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not delete', 'error');
    }
  };

  // ════════════════════════════════════════════════════════
  // SPECIALIZATION CRUD
  // ════════════════════════════════════════════════════════
  const openAddSpec = () => { setSpecForm(EMPTY_SPEC); setEditingId(null); setModal('specForm'); };
  const openEditSpec = (s) => { setSpecForm({ name: s.name, description: s.description ?? '' }); setEditingId(s._id); setModal('specForm'); };

  const submitSpecForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/specializations/${editingId}`, specForm);
        toast('Specialization updated ✓', 'success');
      } else {
        await api.post('/specializations', specForm);
        toast('Specialization added ✓', 'success');
      }
      setModal(null); setSpecForm(EMPTY_SPEC); setEditingId(null);
      fetchSpecializations();
    } catch (err) {
      toast(err.response?.data?.message ?? 'Could not save specialization', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSpecActive = async (s) => {
    try {
      await api.put(`/specializations/${s._id}`, { isActive: !s.isActive });
      fetchSpecializations();
    } catch (err) { toast(err.response?.data?.message ?? 'Action failed', 'error'); }
  };

  const cancelAppt = async (id) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: 'cancelled' } : a));
      toast('Appointment cancelled', 'info');
    } catch (err) { toast(err.response?.data?.message ?? 'Error', 'error'); }
  };

  const PAGE_TITLES = { overview:'Administrator Dashboard', doctors:'Doctor Management', receptionists:'Receptionist Management', specializations:'Specialization Categories', patients:'Patient Records', appointments:'All Appointments', reports:'Reports & Analytics', settings:'System Settings', profile:'My Profile' };

  // ════════════════════════════════════════════════════════
  // OVERVIEW
  // ════════════════════════════════════════════════════════
  const renderOverview = () => (
    <>
      <div className="row g-3 mb-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="col-sm-6 col-xl-4"><div className="stat-card"><div className="placeholder-glow w-100"><span className="placeholder col-12" style={{ height: 60, borderRadius: 10 }} /></div></div></div>)
          : [
              { icon: '👨‍⚕️', label: 'Total Doctors',       value: stats?.totalDoctors,         color: '#2563eb' },
              { icon: '👩‍💼', label: 'Receptionists',        value: stats?.totalReceptionists,   color: '#7c3aed' },
              { icon: '🧑‍🤝‍🧑', label: 'Total Patients',      value: stats?.totalPatients,        color: '#0891b2' },
              { icon: '📅', label: "Today's Appointments", value: stats?.todaysAppointments,   color: '#059669' },
              { icon: '🚫', label: 'Rejected',              value: stats?.rejectedAppointments, color: '#dc2626', sub: 'all time' },
              { icon: '✅', label: 'Completed',             value: stats?.completedAppointments,color: '#0891b2' },
            ].map((s, i) => <div key={i} className="col-sm-6 col-xl-4"><StatCard {...s} /></div>)
        }
      </div>

      <div className="row g-3 mb-4">
        {/* Doctors by specialization */}
        <div className="col-lg-6">
          <div className="content-card h-100">
            <div className="content-card-header">
              <h6 className="content-card-title">Doctors by Specialization</h6>
            </div>
            <div className="content-card-body">
              {!apptStats?.doctorsBySpecialization?.length
                ? <p className="text-muted mb-0" style={{ fontSize: 13.5 }}>No doctors added yet.</p>
                : apptStats.doctorsBySpecialization.map((r) => {
                    const total = apptStats.doctorsBySpecialization.reduce((s, x) => s + x.count, 0);
                    const pct = total ? Math.round((r.count / total) * 100) : 0;
                    return (
                      <div key={r._id} className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ fontSize: 13.5 }}>{r._id}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{r.count}</span>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', borderRadius: 20 }} />
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>

        {/* Doctor availability summary */}
        <div className="col-lg-6">
          <div className="content-card h-100">
            <div className="content-card-header"><h6 className="content-card-title">Doctor Availability Summary</h6></div>
            <div className="content-card-body">
              <div className="d-flex gap-3 flex-wrap">
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const found = apptStats?.availabilitySummary?.find((a) => a._id === opt);
                  return (
                    <div key={opt} className="text-center flex-fill" style={{ minWidth: 100 }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{found?.count ?? 0}</div>
                      <StatusBadge status={opt} />
                    </div>
                  );
                })}
              </div>
              {apptStats?.mostRequestedSpecialization && (
                <div className="mt-4" style={{ fontSize: 13.5, color: '#64748b' }}>
                  <i className="bi bi-star-fill text-warning me-2" />
                  Most requested specialization: <strong>{apptStats.mostRequestedSpecialization}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointments per specialization */}
      {apptStats?.appointmentsBySpecialization?.length > 0 && (
        <div className="content-card mb-4">
          <div className="content-card-header"><h6 className="content-card-title">Appointments per Specialization</h6></div>
          <div className="table-responsive">
            <table className="hospital-table">
              <thead><tr><th>Specialization</th><th>Appointments</th></tr></thead>
              <tbody>
                {apptStats.appointmentsBySpecialization.map((r) => (
                  <tr key={r._id}><td><strong>{r._id}</strong></td><td>{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection breakdown */}
      {apptStats?.rejectionBreakdown?.length > 0 && (
        <div className="content-card mb-4">
          <div className="content-card-header">
            <h6 className="content-card-title">Rejection Reasons Breakdown</h6>
            <span className="text-muted" style={{ fontSize: 13 }}>{apptStats.rejectionBreakdown.reduce((s, r) => s + r.count, 0)} total rejections</span>
          </div>
          <div className="content-card-body">
            {apptStats.rejectionBreakdown.map((r) => {
              const total = apptStats.rejectionBreakdown.reduce((s, x) => s + x.count, 0);
              const pct   = Math.round((r.count / total) * 100);
              return (
                <div key={r._id} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: 13.5 }}>{r._id}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#dc2626', borderRadius: 20, transition: 'width .4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Doctor performance */}
      {apptStats?.doctorStats?.length > 0 && (
        <div className="content-card">
          <div className="content-card-header">
            <h6 className="content-card-title">Doctor Performance</h6>
          </div>
          <div className="table-responsive">
            <table className="hospital-table">
              <thead><tr><th>Doctor</th><th>Total</th><th>Completed</th><th>Rejected</th><th>Pending</th><th>Completion Rate</th></tr></thead>
              <tbody>
                {apptStats.doctorStats.map((d, i) => (
                  <tr key={i}>
                    <td><strong>{d._id}</strong></td>
                    <td>{d.total}</td>
                    <td><span className="badge-status badge-completed">{d.completed}</span></td>
                    <td><span className="badge-status badge-cancelled">{d.rejected}</span></td>
                    <td><span className="badge-status badge-pending">{d.pending}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.total ? Math.round((d.completed / d.total) * 100) : 0}%`, background: '#059669', borderRadius: 20 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>
                          {d.total ? Math.round((d.completed / d.total) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  // ════════════════════════════════════════════════════════
  // DOCTORS (Employee Management)
  // ════════════════════════════════════════════════════════
  const activeSpecializations = specializations.filter((s) => s.isActive);
  const doctorTotalPages = Math.max(1, Math.ceil(doctorsTotal / 10));

  const renderDoctors = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box" style={{ maxWidth: 240 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search name, specialization…" value={doctorSearch}
            onChange={(e) => { setDoctorSearch(e.target.value); setDoctorPage(1); }} />
        </div>
        <select className="form-select form-select-sm" style={{ width: 170, borderRadius: 8 }}
          value={doctorFilters.specialization}
          onChange={(e) => { setDoctorFilters((p) => ({ ...p, specialization: e.target.value })); setDoctorPage(1); }}>
          <option value="">All Specializations</option>
          {activeSpecializations.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
        </select>
        <input className="form-control form-control-sm" placeholder="Department" style={{ width: 130, borderRadius: 8 }}
          value={doctorFilters.department}
          onChange={(e) => { setDoctorFilters((p) => ({ ...p, department: e.target.value })); setDoctorPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 150, borderRadius: 8 }}
          value={doctorFilters.availabilityStatus}
          onChange={(e) => { setDoctorFilters((p) => ({ ...p, availabilityStatus: e.target.value })); setDoctorPage(1); }}>
          <option value="">Any Availability</option>
          {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: 130, borderRadius: 8 }}
          value={doctorFilters.status}
          onChange={(e) => { setDoctorFilters((p) => ({ ...p, status: e.target.value })); setDoctorPage(1); }}>
          <option value="active">Active only</option>
          <option value="disabled">Disabled only</option>
          <option value="all">All</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: 170, borderRadius: 8 }}
          value={`${doctorSort.sortBy}:${doctorSort.sortDir}`}
          onChange={(e) => { const [sortBy, sortDir] = e.target.value.split(':'); setDoctorSort({ sortBy, sortDir }); }}>
          <option value="name:asc">Name (A–Z)</option>
          <option value="name:desc">Name (Z–A)</option>
          <option value="experience:desc">Experience (high–low)</option>
          <option value="experience:asc">Experience (low–high)</option>
          <option value="fee:asc">Fee (low–high)</option>
          <option value="fee:desc">Fee (high–low)</option>
        </select>
        <button className="btn btn-primary ms-auto" style={{ borderRadius: 8 }} onClick={openAddDoctor}>
          <i className="bi bi-person-plus me-1" />Add Doctor
        </button>
      </div>

      <div className="content-card">
        {doctorsLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : doctors.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No doctors match your filters.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead><tr><th>Name</th><th>Specialization</th><th>Department</th><th>Experience</th><th>Fee</th><th>Availability</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d._id}>
                        <td><strong>{d.fullName}</strong><div style={{ fontSize: 12, color: '#94a3b8' }}>{d.email}</div></td>
                        <td>{d.specialization || '—'}</td>
                        <td>{d.department || '—'}</td>
                        <td>{d.experience != null ? `${d.experience} yrs` : '—'}</td>
                        <td>{d.consultationFee != null ? `₹${d.consultationFee}` : '—'}</td>
                        <td><StatusBadge status={d.availabilityStatus} /></td>
                        <td><ActiveBadge isActive={d.isActive} /></td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }} title="View"
                              onClick={() => setViewTarget({ role: 'doctor', employee: d })}>
                              <i className="bi bi-eye" />
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }} title="Edit"
                              onClick={() => openEditDoctor(d)}>
                              <i className="bi bi-pencil" />
                            </button>
                            <button className="btn btn-sm btn-outline-warning" style={{ borderRadius: 6 }} title="Reset Password"
                              onClick={() => resetDoctorPassword(d)}>
                              <i className="bi bi-key" />
                            </button>
                            <button className={`btn btn-sm ${d.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`} style={{ borderRadius: 6 }}
                              title={d.isActive ? 'Disable' : 'Enable'} onClick={() => toggleDoctorActive(d)}>
                              <i className={`bi ${d.isActive ? 'bi-slash-circle' : 'bi-check-circle'}`} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }} title="Delete"
                              onClick={() => { setConfirmTarget({ type: 'doctor', id: d._id, name: d.fullName }); setModal('confirm'); }}>
                              <i className="bi bi-trash" />
                            </button>
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
          <Pagination page={doctorPage} totalPages={doctorTotalPages} onPage={setDoctorPage} total={doctorsTotal} perPage={10} />
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // RECEPTIONISTS
  // ════════════════════════════════════════════════════════
  const renderReceptionists = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box" style={{ maxWidth: 260 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search receptionists…" value={receptionistSearch}
            onChange={(e) => setReceptionistSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary ms-auto" style={{ borderRadius: 8 }} onClick={openAddReceptionist}>
          <i className="bi bi-person-plus me-1" />Add Receptionist
        </button>
      </div>
      <div className="content-card">
        {receptionistsLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : receptionists.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No receptionists yet.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {receptionists.map((r) => (
                      <tr key={r._id}>
                        <td><strong>{r.fullName}</strong></td>
                        <td>{r.email}</td>
                        <td>{r.phone || '—'}</td>
                        <td><ActiveBadge isActive={r.isActive} /></td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }} title="View"
                              onClick={() => setViewTarget({ role: 'receptionist', employee: r })}>
                              <i className="bi bi-eye" />
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }} title="Edit"
                              onClick={() => openEditReceptionist(r)}>
                              <i className="bi bi-pencil" />
                            </button>
                            <button className="btn btn-sm btn-outline-warning" style={{ borderRadius: 6 }} title="Reset Password"
                              onClick={() => resetReceptionistPassword(r)}>
                              <i className="bi bi-key" />
                            </button>
                            <button className={`btn btn-sm ${r.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`} style={{ borderRadius: 6 }}
                              title={r.isActive ? 'Disable' : 'Enable'} onClick={() => toggleReceptionistActive(r)}>
                              <i className={`bi ${r.isActive ? 'bi-slash-circle' : 'bi-check-circle'}`} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }} title="Delete"
                              onClick={() => { setConfirmTarget({ type: 'receptionist', id: r._id, name: r.fullName }); setModal('confirm'); }}>
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
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
  // SPECIALIZATIONS
  // ════════════════════════════════════════════════════════
  const renderSpecializations = () => (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={openAddSpec}>
          <i className="bi bi-plus-lg me-1" />Add Specialization
        </button>
      </div>
      <div className="content-card">
        {specializationsLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : (
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {specializations.map((s) => (
                    <tr key={s._id}>
                      <td><strong>{s.name}</strong></td>
                      <td style={{ color: '#64748b' }}>{s.description || '—'}</td>
                      <td><ActiveBadge isActive={s.isActive} /></td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 6 }} onClick={() => openEditSpec(s)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`} style={{ borderRadius: 6 }}
                            onClick={() => toggleSpecActive(s)}>
                            <i className={`bi ${s.isActive ? 'bi-slash-circle' : 'bi-check-circle'}`} />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }}
                            onClick={() => { setConfirmTarget({ type: 'specialization', id: s._id, name: s.name }); setModal('confirm'); }}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
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
  // APPOINTMENTS
  // ════════════════════════════════════════════════════════
  const renderAppointments = () => (
    <>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <div className="search-box" style={{ width: 240 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="Search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="d-flex gap-1 flex-wrap">
          {['all','pending','approved','rejected','completed','cancelled'].map((f) => (
            <button key={f}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ borderRadius: 8, textTransform: 'capitalize' }}
              onClick={() => { setStatusFilter(f); apptPag.setPage(1); }}>
              {f}
            </button>
          ))}
        </div>
        <div className="d-flex gap-2 ms-auto align-items-center flex-wrap">
          <input type="date" className="form-control form-control-sm" style={{ borderRadius: 8, width: 140 }}
            value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} />
          <span className="text-muted">–</span>
          <input type="date" className="form-control form-control-sm" style={{ borderRadius: 8, width: 140 }}
            value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} />
          {(dateRange.from || dateRange.to) && (
            <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}
              onClick={() => setDateRange({ from: '', to: '' })}>Clear</button>
          )}
        </div>
      </div>
      <div className="content-card">
        {apptLoading
          ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : apptPag.paginated.length === 0
            ? <p className="text-muted text-center py-5 mb-0">No appointments match your filters.</p>
            : (
              <div className="table-responsive">
                <table className="hospital-table">
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date & Time</th><th>Status</th><th>Rejection Reason</th><th>Actions</th></tr></thead>
                  <tbody>
                    {apptPag.paginated.map((a) => (
                      <tr key={a._id} style={{ background: a.status === 'rejected' ? '#fff7f7' : undefined }}>
                        <td><strong>{a.patientName}</strong></td>
                        <td>{a.doctorName}</td>
                        <td>{new Date(a.date).toLocaleDateString('en-IN')}<div style={{ fontSize: 12, color: '#94a3b8' }}>{a.timeSlot}</div></td>
                        <td><StatusBadge status={a.status} /></td>
                        <td style={{ maxWidth: 200 }}>
                          {a.status === 'rejected'
                            ? <div>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#991b1b' }}>{a.rejectionReasonType}</div>
                                {a.rejectedBy?.fullName && <div style={{ fontSize: 11.5, color: '#64748b' }}>by {a.rejectedBy.fullName}</div>}
                              </div>
                            : <span className="text-muted" style={{ fontSize: 13 }}>—</span>}
                        </td>
                        <td>
                          {['pending', 'approved'].includes(a.status) && (
                            <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 6 }} onClick={() => cancelAppt(a._id)}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
        <div style={{ padding: '8px 16px 16px' }}>
          <Pagination page={apptPag.page} totalPages={apptPag.totalPages} onPage={apptPag.setPage} total={filteredAppts.length} perPage={10} />
        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════
  const renderReports = () => {
    const monthly = [
      { month: 'January', appointments: 124, completed: 98,  rejected: 12, revenue: 98000  },
      { month: 'February',appointments: 110, completed: 89,  rejected: 8,  revenue: 87500  },
      { month: 'March',   appointments: 138, completed: 115, rejected: 15, revenue: 112000 },
      { month: 'April',   appointments: 155, completed: 130, rejected: 10, revenue: 128500 },
    ];
    return (
      <>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <input type="date" className="form-control form-control-sm" style={{ borderRadius: 8, width: 150 }} value={dateRange.from} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} />
          <span className="align-self-center text-muted">–</span>
          <input type="date" className="form-control form-control-sm" style={{ borderRadius: 8, width: 150 }} value={dateRange.to} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} />
          <button className="btn btn-success btn-sm ms-auto" style={{ borderRadius: 8 }} onClick={() => { window.print(); toast('Preparing print…', 'info'); }}>
            <i className="bi bi-download me-1" />Export / Print
          </button>
        </div>

        <div className="row g-3 mb-4">
          {[
            { icon: '📅', label: 'Total Appointments',  value: stats?.totalAppointments,  color: '#2563eb' },
            { icon: '✅', label: 'Completed',            value: stats?.completedAppointments, color: '#059669' },
            { icon: '🚫', label: 'Rejected',             value: stats?.rejectedAppointments,  color: '#dc2626' },
            { icon: '💰', label: 'Monthly Revenue (₹)', value: `₹${(stats?.monthlyRevenue ?? 0).toLocaleString('en-IN')}`, color: '#d97706' },
          ].map((s, i) => <div key={i} className="col-sm-6 col-lg-3"><StatCard {...s} /></div>)}
        </div>

        <div className="content-card mb-4">
          <div className="content-card-header"><h6 className="content-card-title">Monthly Summary</h6></div>
          <div className="table-responsive">
            <table className="hospital-table">
              <thead><tr><th>Month</th><th>Total Appointments</th><th>Completed</th><th>Rejected</th><th>Revenue (₹)</th><th>Completion %</th></tr></thead>
              <tbody>
                {monthly.map((r) => (
                  <tr key={r.month}>
                    <td><strong>{r.month}</strong></td>
                    <td>{r.appointments}</td>
                    <td><span className="badge-status badge-completed">{r.completed}</span></td>
                    <td><span className="badge-status badge-cancelled">{r.rejected}</span></td>
                    <td>₹{r.revenue.toLocaleString('en-IN')}</td>
                    <td>{Math.round((r.completed / r.appointments) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {apptStats?.rejectionBreakdown?.length > 0 && (
          <div className="content-card">
            <div className="content-card-header"><h6 className="content-card-title">Rejection Reasons Report</h6></div>
            <div className="table-responsive">
              <table className="hospital-table">
                <thead><tr><th>Reason</th><th>Count</th><th>Percentage</th></tr></thead>
                <tbody>
                  {apptStats.rejectionBreakdown.map((r) => {
                    const total = apptStats.rejectionBreakdown.reduce((s, x) => s + x.count, 0);
                    return (
                      <tr key={r._id}>
                        <td>{r._id}</td>
                        <td>{r.count}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: 80, height: 6, background: '#f1f5f9', borderRadius: 20, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.round((r.count / total) * 100)}%`, background: '#dc2626', borderRadius: 20 }} />
                            </div>
                            {Math.round((r.count / total) * 100)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSettings = () => (
    <div className="content-card" style={{ maxWidth: 600 }}>
      <div className="content-card-header"><h6 className="content-card-title">System Settings</h6></div>
      <div className="content-card-body">
        {['Hospital Name', 'Contact Email', 'Contact Phone', 'Address', 'Working Hours'].map((f) => (
          <div className="mb-3" key={f}>
            <label className="form-label">{f}</label>
            <input className="form-control" placeholder={`Enter ${f.toLowerCase()}`} style={{ borderRadius: 10 }} />
          </div>
        ))}
        <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => toast('Settings saved ✓', 'success')}>
          <i className="bi bi-floppy me-1" />Save Settings
        </button>
      </div>
    </div>
  );

  const renderProfile = () => {
    const name = localStorage.getItem('name') ?? ''; const email = localStorage.getItem('email') ?? '';
    return (
      <div className="content-card" style={{ maxWidth: 520 }}>
        <div className="content-card-header"><h6 className="content-card-title">Administrator Profile</h6></div>
        <div className="content-card-body">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>{name.charAt(0)}</div>
            <div><h5 className="mb-1">{name}</h5><span className="navbar-role-badge role-administrator">Administrator</span></div>
          </div>
          {[['Full Name', name], ['Email', email]].map(([l, v]) => (
            <div className="mb-3" key={l}><label className="form-label">{l}</label><input className="form-control" defaultValue={v} style={{ borderRadius: 10 }} /></div>
          ))}
          <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => toast('Profile updated ✓', 'success')}>
            <i className="bi bi-floppy me-1" />Update
          </button>
        </div>
      </div>
    );
  };

  const renderPatients = () => (
    <div className="content-card">
      <div className="content-card-header"><h6 className="content-card-title">Patient Registry</h6></div>
      <p className="text-muted px-4 py-3 mb-0" style={{ fontSize: 14 }}>
        <i className="bi bi-info-circle me-2" />Patient data is managed by Receptionists. This view shows patients linked to appointments.
      </p>
      {appointments.length > 0 && (
        <div className="table-responsive">
          <table className="hospital-table">
            <thead><tr><th>Patient Name</th><th>Phone</th><th>Doctor</th><th>Last Appointment</th><th>Status</th></tr></thead>
            <tbody>
              {[...new Map(appointments.map((a) => [a.patientName, a])).values()].slice(0, 20).map((a) => (
                <tr key={a._id}>
                  <td><strong>{a.patientName}</strong></td>
                  <td>{a.patientPhone ?? '—'}</td>
                  <td>{a.doctorName}</td>
                  <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const SECTIONS = { overview: renderOverview, doctors: renderDoctors, receptionists: renderReceptionists, specializations: renderSpecializations, patients: renderPatients, appointments: renderAppointments, reports: renderReports, settings: renderSettings, profile: renderProfile };

  return (
    <>
      <DashboardLayout sidebarLinks={SIDEBAR_LINKS} activeSection={section} onSection={(s) => { setSection(s); setSearchTerm(''); setStatusFilter('all'); }} pageTitle={PAGE_TITLES[section]}>
        <p className="section-subheading">{section === 'overview' ? "Full system overview and analytics." : `Manage ${section}`}</p>
        {(SECTIONS[section] ?? renderOverview)()}
      </DashboardLayout>

      {/* Add / Edit Doctor */}
      {modal === 'doctorForm' && (
        <Modal title={editingId ? 'Edit Doctor' : 'Add Doctor'} onClose={() => setModal(null)} wide>
          <form onSubmit={submitDoctorForm}>
            <div className="modal-custom-body modal-custom-scroll">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" style={{ borderRadius: 10 }} required placeholder="Dr. First Last"
                    value={doctorForm.fullName} onChange={(e) => setDoctorForm((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-control" style={{ borderRadius: 10 }} required placeholder="doctor@hospital.com"
                    value={doctorForm.email} onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" style={{ borderRadius: 10 }} placeholder="10-digit number"
                    value={doctorForm.phone} onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Department</label>
                  <input className="form-control" style={{ borderRadius: 10 }} placeholder="e.g. Cardiology Dept."
                    value={doctorForm.department} onChange={(e) => setDoctorForm((p) => ({ ...p, department: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Specialization *</label>
                  <select className="form-select" style={{ borderRadius: 10 }} required
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, specialization: e.target.value }))}>
                    <option value="">Select specialization</option>
                    {activeSpecializations.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                {doctorForm.specialization === 'Other' && (
                  <div className="col-md-6">
                    <label className="form-label">Custom Specialization *</label>
                    <input className="form-control" style={{ borderRadius: 10 }} required placeholder="Enter specialization"
                      value={doctorForm.customSpecialization} onChange={(e) => setDoctorForm((p) => ({ ...p, customSpecialization: e.target.value }))} />
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label">Qualification</label>
                  <input className="form-control" style={{ borderRadius: 10 }} placeholder="e.g. MBBS, MD"
                    value={doctorForm.qualification} onChange={(e) => setDoctorForm((p) => ({ ...p, qualification: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Experience (yrs)</label>
                  <input type="number" min="0" className="form-control" style={{ borderRadius: 10 }}
                    value={doctorForm.experience} onChange={(e) => setDoctorForm((p) => ({ ...p, experience: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Consultation Fee (₹)</label>
                  <input type="number" min="0" className="form-control" style={{ borderRadius: 10 }}
                    value={doctorForm.consultationFee} onChange={(e) => setDoctorForm((p) => ({ ...p, consultationFee: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Availability Status</label>
                  <select className="form-select" style={{ borderRadius: 10 }}
                    value={doctorForm.availabilityStatus}
                    onChange={(e) => setDoctorForm((p) => ({ ...p, availabilityStatus: e.target.value }))}>
                    {AVAILABILITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Available Days</label>
                  <div className="d-flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const selected = doctorForm.availableDays.includes(day);
                      return (
                        <button key={day} type="button" onClick={() => toggleDoctorDay(day)}
                          className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                          style={{ borderRadius: 20 }}>
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label">Available Time Slots <small className="text-muted">(comma-separated, e.g. 09:00, 09:30, 10:00)</small></label>
                  <input className="form-control" style={{ borderRadius: 10 }} placeholder="09:00, 09:30, 10:00, 14:00"
                    value={doctorForm.availableTimeSlotsText} onChange={(e) => setDoctorForm((p) => ({ ...p, availableTimeSlotsText: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-floppy me-1" />}
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Receptionist */}
      {modal === 'receptionForm' && (
        <Modal title={editingId ? 'Edit Receptionist' : 'Add Receptionist'} onClose={() => setModal(null)}>
          <form onSubmit={submitReceptionForm}>
            <div className="modal-custom-body">
              <div className="mb-3">
                <label className="form-label">Full Name *</label>
                <input className="form-control" style={{ borderRadius: 10 }} required placeholder="First Last"
                  value={receptionForm.fullName} onChange={(e) => setReceptionForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" style={{ borderRadius: 10 }} required placeholder="reception@hospital.com"
                  value={receptionForm.email} onChange={(e) => setReceptionForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">Phone Number</label>
                <input className="form-control" style={{ borderRadius: 10 }} placeholder="10-digit number"
                  value={receptionForm.phone} onChange={(e) => setReceptionForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-floppy me-1" />}
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Specialization */}
      {modal === 'specForm' && (
        <Modal title={editingId ? 'Edit Specialization' : 'Add Specialization'} onClose={() => setModal(null)}>
          <form onSubmit={submitSpecForm}>
            <div className="modal-custom-body">
              <div className="mb-3">
                <label className="form-label">Name *</label>
                <input className="form-control" style={{ borderRadius: 10 }} required placeholder="e.g. Cardiologist"
                  value={specForm.name} onChange={(e) => setSpecForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">Description</label>
                <textarea rows={2} className="form-control" style={{ borderRadius: 10 }} placeholder="Optional description"
                  value={specForm.description} onChange={(e) => setSpecForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-custom-footer">
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: 8 }} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-floppy me-1" />}
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View employee details */}
      {viewTarget && (
        <Modal title={`${viewTarget.role === 'doctor' ? 'Doctor' : 'Receptionist'} Details`} onClose={() => setViewTarget(null)}>
          <div className="modal-custom-body">
            {[
              ['Full Name', viewTarget.employee.fullName],
              ['Email', viewTarget.employee.email],
              ['Phone', viewTarget.employee.phone || '—'],
              ...(viewTarget.role === 'doctor' ? [
                ['Department', viewTarget.employee.department || '—'],
                ['Specialization', viewTarget.employee.specialization || '—'],
                ['Qualification', viewTarget.employee.qualification || '—'],
                ['Experience', viewTarget.employee.experience != null ? `${viewTarget.employee.experience} yrs` : '—'],
                ['Consultation Fee', viewTarget.employee.consultationFee != null ? `₹${viewTarget.employee.consultationFee}` : '—'],
                ['Availability', viewTarget.employee.availabilityStatus],
                ['Available Days', (viewTarget.employee.availableDays ?? []).join(', ') || '—'],
                ['Available Time Slots', (viewTarget.employee.availableTimeSlots ?? []).join(', ') || '—'],
              ] : []),
              ['Role', viewTarget.role === 'doctor' ? 'Doctor' : 'Receptionist'],
              ['Account Status', viewTarget.employee.isActive ? 'Active' : 'Disabled'],
            ].map(([label, value]) => (
              <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #f1f5f9' }} key={label}>
                <span style={{ color: '#64748b', fontSize: 13.5 }}>{label}</span>
                <strong style={{ fontSize: 13.5, textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </div>
          <div className="modal-custom-footer">
            <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setViewTarget(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Temporary password result */}
      {tempPasswordInfo && (
        <Modal title="Temporary Password Generated" onClose={() => setTempPasswordInfo(null)}>
          <div className="modal-custom-body text-center py-2">
            <div style={{ fontSize: 40 }}>🔑</div>
            <p className="mt-2 mb-1">
              {tempPasswordInfo.role} account for <strong>{tempPasswordInfo.name}</strong> is ready.
            </p>
            <p className="text-muted mb-3" style={{ fontSize: 13 }}>
              Share this temporary password securely. They'll be required to change it on first login.
            </p>
            <div className="d-flex align-items-center justify-content-center gap-2">
              <code style={{ fontSize: 18, background: '#f1f5f9', padding: '8px 16px', borderRadius: 8 }}>
                {tempPasswordInfo.password}
              </code>
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 8 }}
                onClick={() => { navigator.clipboard?.writeText(tempPasswordInfo.password); toast('Copied to clipboard', 'success'); }}>
                <i className="bi bi-clipboard" />
              </button>
            </div>
          </div>
          <div className="modal-custom-footer">
            <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => setTempPasswordInfo(null)}>Done</button>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {modal === 'confirm' && (
        <Modal title="Confirm Delete" onClose={() => setModal(null)}>
          <div className="modal-custom-body text-center py-2">
            <div style={{ fontSize: 48 }}>🗑️</div>
            <p className="mt-2">Remove <strong>{confirmTarget?.name}</strong>?</p>
            <p className="text-muted" style={{ fontSize: 13 }}>This action cannot be undone.</p>
          </div>
          <div className="modal-custom-footer">
            <button className="btn btn-outline-secondary" style={{ borderRadius: 8 }} onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" style={{ borderRadius: 8 }} onClick={confirmDelete}><i className="bi bi-trash me-1" />Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}
