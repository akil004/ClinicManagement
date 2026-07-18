import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

/**
 * generateTempPassword — readable, random temporary password handed to a
 * newly created (or reset) doctor/receptionist account.
 */
const generateTempPassword = () => {
  const raw = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return `${raw.slice(0, 8)}#${Math.floor(1000 + Math.random() * 9000)}`;
};

const DOCTOR_FIELDS = [
  'fullName', 'email', 'phone', 'department', 'specialization', 'qualification',
  'experience', 'consultationFee', 'availabilityStatus', 'availableDays', 'availableTimeSlots',
];
const RECEPTIONIST_FIELDS = ['fullName', 'email', 'phone'];

const fieldsForRole = (role) => (role === 'doctor' ? DOCTOR_FIELDS : RECEPTIONIST_FIELDS);

const pickAllowed = (role, body) => {
  const out = {};
  fieldsForRole(role).forEach((f) => {
    if (body[f] !== undefined) out[f] = body[f];
  });
  return out;
};

/**
 * buildEmployeeControllers(role) — factory that returns the full set of
 * CRUD + lifecycle handlers scoped to a single role ('doctor' or
 * 'receptionist'). The role is always fixed by the route/controller, never
 * taken from the request body, so a caller can never choose or change a
 * user's role.
 */
const buildEmployeeControllers = (role) => {
  const roleLabel = role === 'doctor' ? 'Doctor' : 'Receptionist';

  // @route  GET /api/employees/doctors | /api/employees/receptionists
  // @access administrator (doctors list is also readable by receptionist for booking)
  const list = async (req, res) => {
    try {
      const {
        search, specialization, department, availabilityStatus,
        minExperience, maxExperience, minFee, maxFee,
        status, // 'active' | 'disabled' | 'all'
        sortBy = 'fullName', sortDir = 'asc',
        page = 1, limit = 20,
      } = req.query;

      const query = { role };

      if (status === 'active')       query.isActive = true;
      else if (status === 'disabled') query.isActive = false;
      // status === 'all' (or omitted) -> no isActive filter

      if (specialization)       query.specialization = specialization;
      if (department)          query.department = new RegExp(department, 'i');
      if (availabilityStatus)  query.availabilityStatus = availabilityStatus;

      if (minExperience || maxExperience) {
        query.experience = {};
        if (minExperience) query.experience.$gte = Number(minExperience);
        if (maxExperience) query.experience.$lte = Number(maxExperience);
      }
      if (minFee || maxFee) {
        query.consultationFee = {};
        if (minFee) query.consultationFee.$gte = Number(minFee);
        if (maxFee) query.consultationFee.$lte = Number(maxFee);
      }
      if (search) {
        const re = new RegExp(search, 'i');
        query.$or = [{ fullName: re }, { specialization: re }, { department: re }, { email: re }];
      }

      const SORT_FIELDS = {
        name:       'fullName',
        experience: 'experience',
        fee:        'consultationFee',
        createdAt:  'createdAt',
      };
      const sortField = SORT_FIELDS[sortBy] ?? 'fullName';
      const sort = { [sortField]: sortDir === 'desc' ? -1 : 1 };

      const skip  = (Number(page) - 1) * Number(limit);
      const total = await User.countDocuments(query);
      const employees = await User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      return res.status(200).json({
        employees, total, page: Number(page), totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      console.error(`list ${role}s:`, error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  GET /api/employees/doctors/:id | /api/employees/receptionists/:id
  const getOne = async (req, res) => {
    try {
      const employee = await User.findOne({ _id: req.params.id, role }).select('-password');
      if (!employee) return res.status(404).json({ message: `${roleLabel} not found` });
      return res.status(200).json({ employee });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  POST /api/employees/doctors | /api/employees/receptionists
  // @access administrator only
  const create = async (req, res) => {
    try {
      const data = pickAllowed(role, req.body);
      const { fullName, email } = data;

      if (!fullName || !email) {
        return res.status(400).json({ message: 'Full name and email are required' });
      }
      if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address' });

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

      if (role === 'doctor' && !data.specialization) {
        return res.status(400).json({ message: 'Specialization is required for a doctor' });
      }

      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const employee = await User.create({
        ...data,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,                       // always assigned automatically — never from the client
        mustChangePassword: true,   // forces password change on first login
        isActive: true,
        createdBy: req.user._id,
      });

      const { password, ...safe } = employee.toObject();

      return res.status(201).json({
        message: `${roleLabel} created successfully`,
        employee: safe,
        temporaryPassword: tempPassword, // shown once to the administrator
      });
    } catch (error) {
      console.error(`create ${role}:`, error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  PUT /api/employees/doctors/:id | /api/employees/receptionists/:id
  // @access administrator only
  const update = async (req, res) => {
    try {
      const employee = await User.findOne({ _id: req.params.id, role });
      if (!employee) return res.status(404).json({ message: `${roleLabel} not found` });

      const data = pickAllowed(role, req.body);

      if (data.email && data.email.toLowerCase() !== employee.email) {
        if (!isValidEmail(data.email)) return res.status(400).json({ message: 'Invalid email address' });
        const dup = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: employee._id } });
        if (dup) return res.status(409).json({ message: 'An account with this email already exists' });
        data.email = data.email.toLowerCase();
      }

      Object.assign(employee, data);
      await employee.save();

      const { password, ...safe } = employee.toObject();
      return res.status(200).json({ message: `${roleLabel} updated successfully`, employee: safe });
    } catch (error) {
      console.error(`update ${role}:`, error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  PATCH /api/employees/doctors/:id/disable | .../receptionists/:id/disable
  // @access administrator only
  // @body   { isActive: boolean }  (toggle — defaults to flipping current value)
  const setActive = async (req, res) => {
    try {
      const employee = await User.findOne({ _id: req.params.id, role });
      if (!employee) return res.status(404).json({ message: `${roleLabel} not found` });

      employee.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !employee.isActive;
      await employee.save();

      const { password, ...safe } = employee.toObject();
      return res.status(200).json({
        message: employee.isActive ? `${roleLabel} enabled` : `${roleLabel} disabled`,
        employee: safe,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  DELETE /api/employees/doctors/:id | /api/employees/receptionists/:id
  // @access administrator only
  const remove = async (req, res) => {
    try {
      const employee = await User.findOneAndDelete({ _id: req.params.id, role });
      if (!employee) return res.status(404).json({ message: `${roleLabel} not found` });
      return res.status(200).json({ message: `${roleLabel} deleted successfully` });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // @route  PATCH /api/employees/doctors/:id/reset-password | .../receptionists/:id/reset-password
  // @access administrator only
  const resetPassword = async (req, res) => {
    try {
      const employee = await User.findOne({ _id: req.params.id, role });
      if (!employee) return res.status(404).json({ message: `${roleLabel} not found` });

      const tempPassword = generateTempPassword();
      employee.password = await bcrypt.hash(tempPassword, 10);
      employee.mustChangePassword = true;
      await employee.save();

      return res.status(200).json({
        message: `Password reset for ${employee.fullName}`,
        temporaryPassword: tempPassword,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  };

  return { list, getOne, create, update, setActive, remove, resetPassword };
};

const doctorControllers       = buildEmployeeControllers('doctor');
const receptionistControllers = buildEmployeeControllers('receptionist');

export { doctorControllers, receptionistControllers };
