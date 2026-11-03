/**
 * env.js — single source of truth for environment-driven configuration.
 * Nothing that can change between environments should be hard-coded
 * anywhere else in the backend — read it from `config` instead.
 */
import 'dotenv/config';

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/hospital_management',

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? 'http://localhost:5173',

  appName: process.env.APP_NAME ?? 'Hospital Management System',
  appTimezone: process.env.APP_TIMEZONE ?? 'Asia/Kolkata',

  doctorOnlineTimeoutMinutes: toInt(process.env.DOCTOR_ONLINE_TIMEOUT_MINUTES, 10),

  paginationDefaultLimit: toInt(process.env.PAGINATION_DEFAULT_LIMIT, 20),
  paginationMaxLimit: toInt(process.env.PAGINATION_MAX_LIMIT, 100),

  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '10mb',

  admin: {
    name: process.env.ADMIN_NAME ?? 'Hospital Administrator',
    email: (process.env.ADMIN_EMAIL ?? 'admin@hospital.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? 'Admin@12345',
  },
};

if (!config.jwtSecret) {
  // Fail fast rather than silently signing tokens with `undefined`.
  console.error('❌ JWT_SECRET is not set in the environment. Set it in backend/.env');
  process.exit(1);
}

export default config;
