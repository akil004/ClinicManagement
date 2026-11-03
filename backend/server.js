import express from 'express';
import cors    from 'cors';
import { config }          from './config/env.js';
import connectDB           from './config/db.js';
import User                from './models/User.js';
import authRoutes          from './routes/authRoutes.js';
import dashboardRoutes     from './routes/dashboardRoutes.js';
import appointmentRoutes   from './routes/appointmentRoutes.js';
import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
import employeeRoutes      from './routes/employeeRoutes.js';
import specializationRoutes from './routes/specializationRoutes.js';
import patientRoutes       from './routes/patientRoutes.js';
import prescriptionRoutes  from './routes/prescriptionRoutes.js';
import labReportRoutes     from './routes/labReportRoutes.js';
import patientDocumentRoutes from './routes/patientDocumentRoutes.js';
import billingRoutes       from './routes/billingRoutes.js';
import seedSpecializations from './seed/seedSpecializations.js';

const app = express();

// Connect to MongoDB
await connectDB();

// Seed the default specialization categories once (no-op after the first run)
await seedSpecializations();

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: config.jsonBodyLimit }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/appointments',    appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/employees',       employeeRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/patients',        patientRoutes);
app.use('/api/prescriptions',   prescriptionRoutes);
app.use('/api/lab-reports',     labReportRoutes);
app.use('/api/documents',       patientDocumentRoutes);
app.use('/api/billing',         billingRoutes);

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', message: `${config.appName} API` }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Doctor auto-offline sweep ───────────────────────────────
// A doctor who has gone inactive for longer than DOCTOR_ONLINE_TIMEOUT_MINUTES
// (env-configured, never hard-coded) is automatically flipped to offline.
// This runs alongside the on-the-fly computed status returned by
// GET /api/employees/doctors/online-status, so the persisted flag in Mongo
// stays in sync even between admin dashboard visits.
const sweepInactiveDoctors = async () => {
  try {
    const cutoff = new Date(Date.now() - config.doctorOnlineTimeoutMinutes * 60 * 1000);
    await User.updateMany(
      { role: 'doctor', isOnline: true, lastActiveAt: { $lt: cutoff } },
      { isOnline: false }
    );
  } catch (error) {
    console.error('Doctor online-status sweep error:', error.message);
  }
};
const sweepIntervalMs = Math.max(1, Math.min(config.doctorOnlineTimeoutMinutes, 5)) * 60 * 1000;
setInterval(sweepInactiveDoctors, sweepIntervalMs);

// ── Start ─────────────────────────────────────────────────
app.listen(config.port, () => console.log(`🚀 Server running on http://localhost:${config.port}`));
