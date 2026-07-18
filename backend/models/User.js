import mongoose from 'mongoose';

const AVAILABILITY_STATUSES = ['Available', 'Busy', 'On Leave'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    email:    { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'] },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['administrator', 'doctor', 'receptionist'], required: [true, 'Role is required'] },

    // ── Account lifecycle ──────────────────────────────
    // Doctors/receptionists are created by the administrator with a temporary
    // password. They must change it before they can access their dashboard.
    mustChangePassword: { type: Boolean, default: false },
    isActive:           { type: Boolean, default: true },
    createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Doctor-specific fields (role === 'doctor') ─────
    department:         { type: String, trim: true },
    specialization:      { type: String, trim: true },
    qualification:       { type: String, trim: true },
    experience:          { type: Number, min: 0 },
    consultationFee:     { type: Number, min: 0 },
    availabilityStatus:  { type: String, enum: AVAILABILITY_STATUSES, default: 'Available' },
    availableDays:       [{ type: String, enum: DAYS_OF_WEEK }],
    availableTimeSlots:  [{ type: String, trim: true }],
  },
  { timestamps: true }
);

userSchema.index({ role: 1, specialization: 1 });
userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, availabilityStatus: 1 });
userSchema.index({ fullName: 'text', specialization: 'text', department: 'text' });

const User = mongoose.model('User', userSchema);

export { AVAILABILITY_STATUSES, DAYS_OF_WEEK };
export default User;
