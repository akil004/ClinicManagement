import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  });

const publicUser = (user) => ({
  id:                 user._id,
  name:               user.fullName,
  email:              user.email,
  role:               user.role,
  mustChangePassword: user.mustChangePassword,
});

// NOTE: There is no public registration endpoint. Administrator accounts are
// seeded directly into the database (see backend/seed/seedAdmin.js), and
// doctor/receptionist accounts can only be created by an administrator via
// the Employee Management APIs (see employeeController.js).

// @route  POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been disabled. Contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error — please try again later' });
  }
};

// @route  GET /api/auth/me
// @access Authenticated
const getMe = async (req, res) => {
  const extra = req.user.role === 'doctor'
    ? {
        department: req.user.department,
        specialization: req.user.specialization,
        qualification: req.user.qualification,
        experience: req.user.experience,
        consultationFee: req.user.consultationFee,
        availabilityStatus: req.user.availabilityStatus,
      }
    : {};
  return res.status(200).json({ user: { ...publicUser(req.user), phone: req.user.phone, ...extra } });
};

// @route  POST /api/auth/change-password
// @access Authenticated
// @body   { currentPassword, newPassword, confirmNewPassword }
// Used both for the mandatory first-login password change (temporary
// password issued by the administrator) and for voluntary password changes.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully', user: publicUser(user) });
  } catch (error) {
    console.error('changePassword error:', error.message);
    return res.status(500).json({ message: 'Server error — please try again later' });
  }
};

export { login, getMe, changePassword, isValidEmail, generateToken, publicUser };
