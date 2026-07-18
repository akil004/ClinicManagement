import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema(
  {
    name:        { type: String, required: [true, 'Specialization name is required'], trim: true, unique: true },
    description: { type: String, trim: true },
    isActive:    { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Default list requested by the hospital — seeded once when the collection is empty.
// The administrator can still add, edit, or delete categories afterwards.
const DEFAULT_SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Dermatologist',
  'Pediatrician', 'Gynecologist', 'Ophthalmologist', 'ENT Specialist', 'Psychiatrist',
  'Urologist', 'Gastroenterologist', 'Pulmonologist', 'Nephrologist', 'Oncologist',
  'Endocrinologist', 'Dentist', 'Physiotherapist', 'Radiologist', 'Anesthesiologist', 'Other',
];

const Specialization = mongoose.model('Specialization', specializationSchema);

export { DEFAULT_SPECIALIZATIONS };
export default Specialization;
