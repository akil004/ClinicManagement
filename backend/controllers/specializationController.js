import Specialization from '../models/Specialization.js';
import User from '../models/User.js';

// @route  GET /api/specializations
// @access Any authenticated user (administrator, doctor, receptionist)
// @query  activeOnly=true to only return categories currently in use
const getSpecializations = async (req, res) => {
  try {
    const query = {};
    if (req.query.activeOnly === 'true') query.isActive = true;

    const specializations = await Specialization.find(query).sort({ name: 1 }).lean();
    return res.status(200).json({ specializations });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  POST /api/specializations
// @access administrator only
const createSpecialization = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Specialization name is required' });

    const existing = await Specialization.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) return res.status(409).json({ message: 'This specialization already exists' });

    const specialization = await Specialization.create({
      name: name.trim(), description: description?.trim() ?? '', createdBy: req.user._id,
    });
    return res.status(201).json({ message: 'Specialization added', specialization });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PUT /api/specializations/:id
// @access administrator only
const updateSpecialization = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) return res.status(404).json({ message: 'Specialization not found' });

    if (name?.trim() && name.trim() !== specialization.name) {
      const dup = await Specialization.findOne({ name: new RegExp(`^${name.trim()}$`, 'i'), _id: { $ne: specialization._id } });
      if (dup) return res.status(409).json({ message: 'Another specialization already uses this name' });

      // Keep doctor records pointing at the old name in sync with the rename.
      await User.updateMany({ role: 'doctor', specialization: specialization.name }, { specialization: name.trim() });
      specialization.name = name.trim();
    }
    if (description !== undefined) specialization.description = description.trim();
    if (typeof isActive === 'boolean') specialization.isActive = isActive;

    await specialization.save();
    return res.status(200).json({ message: 'Specialization updated', specialization });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  DELETE /api/specializations/:id
// @access administrator only
const deleteSpecialization = async (req, res) => {
  try {
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) return res.status(404).json({ message: 'Specialization not found' });

    const inUse = await User.countDocuments({ role: 'doctor', specialization: specialization.name });
    if (inUse > 0) {
      return res.status(409).json({
        message: `Cannot delete — ${inUse} doctor(s) are currently assigned this specialization. Reassign them first or mark it inactive instead.`,
      });
    }

    await specialization.deleteOne();
    return res.status(200).json({ message: 'Specialization deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export { getSpecializations, createSpecialization, updateSpecialization, deleteSpecialization };
