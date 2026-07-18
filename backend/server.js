import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import connectDB           from './config/db.js';
import authRoutes          from './routes/authRoutes.js';
import dashboardRoutes     from './routes/dashboardRoutes.js';
import appointmentRoutes   from './routes/appointmentRoutes.js';
import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
import employeeRoutes      from './routes/employeeRoutes.js';
import specializationRoutes from './routes/specializationRoutes.js';
import seedSpecializations from './seed/seedSpecializations.js';

const app = express();

// Connect to MongoDB
await connectDB();

// Seed the default specialization categories once (no-op after the first run)
await seedSpecializations();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/appointments',    appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/employees',       employeeRoutes);
app.use('/api/specializations', specializationRoutes);

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', message: 'Hospital Management API' }));

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
