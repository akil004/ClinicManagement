import Specialization, { DEFAULT_SPECIALIZATIONS } from '../models/Specialization.js';

/**
 * seedSpecializations — populates the Specialization collection with the
 * hospital's default categories the very first time the server connects to
 * an empty database. Safe to call on every boot; it's a no-op once any
 * specialization document exists so administrator edits/deletes are never
 * overwritten.
 */
const seedSpecializations = async () => {
  try {
    const count = await Specialization.countDocuments();
    if (count > 0) return;

    await Specialization.insertMany(
      DEFAULT_SPECIALIZATIONS.map((name) => ({ name, description: '', isActive: true }))
    );
    console.log(`🌱 Seeded ${DEFAULT_SPECIALIZATIONS.length} default specializations`);
  } catch (error) {
    console.error('Specialization seed error:', error.message);
  }
};

export default seedSpecializations;
