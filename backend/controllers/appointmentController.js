import Appointment, { REJECTION_REASON_TYPES } from '../models/Appointment.js';

// ── Helpers ─────────────────────────────────────────────
const buildQuery = (role, userId) => {
  if (role === 'doctor')    return { doctorId: userId };
  if (role === 'administrator') return {};
  return {}; // receptionist sees all
};

// @route  GET /api/appointments
// @access  All authenticated roles
const getAppointments = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const query = buildQuery(req.user.role, req.user._id);

    if (status) query.status = status;
    if (date)   query.date = { $gte: new Date(date + 'T00:00:00'), $lte: new Date(date + 'T23:59:59') };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('rejectedBy', 'fullName')
      .lean();

    return res.status(200).json({ appointments, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('getAppointments:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  GET /api/appointments/:id
const getAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('doctorId',    'fullName email')
      .populate('rejectedBy',  'fullName')
      .populate('approvedBy',  'fullName')
      .populate('createdBy',   'fullName')
      .lean();

    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    return res.status(200).json({ appointment: appt });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  POST /api/appointments
// @access  receptionist | administrator
const createAppointment = async (req, res) => {
  try {
    const {
      patientName, patientAge, patientPhone, patientEmail, patientBloodGroup, patientGender,
      doctorId, doctorName, date, timeSlot, complaint, notes,
    } = req.body;

    if (!patientName || !doctorId || !doctorName || !date || !timeSlot) {
      return res.status(400).json({ message: 'Patient name, doctor, date, and time slot are required' });
    }

    const appt = await Appointment.create({
      patientName, patientAge, patientPhone, patientEmail, patientBloodGroup, patientGender,
      doctorId, doctorName, date: new Date(date), timeSlot, complaint, notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: 'Appointment created', appointment: appt });
  } catch (error) {
    console.error('createAppointment:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PATCH /api/appointments/:id/approve
// @access  doctor
const approveAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    if (appt.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve this appointment' });
    }
    if (appt.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve an appointment with status: ${appt.status}` });
    }

    appt.status     = 'approved';
    appt.approvedBy = req.user._id;
    appt.approvedAt = new Date();
    await appt.save();

    return res.status(200).json({ message: 'Appointment approved', appointment: appt });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PATCH /api/appointments/:id/reject
// @access  doctor
// @body   { rejectionReasonType, rejectionReason? }
const rejectAppointment = async (req, res) => {
  try {
    const { rejectionReasonType, rejectionReason } = req.body;

    // Validate reason
    if (!rejectionReasonType) {
      return res.status(400).json({ message: 'A rejection reason type is required' });
    }
    if (!REJECTION_REASON_TYPES.includes(rejectionReasonType)) {
      return res.status(400).json({ message: 'Invalid rejection reason type' });
    }
    if (rejectionReasonType === 'Other' && !rejectionReason?.trim()) {
      return res.status(400).json({ message: 'A custom reason is required when "Other" is selected' });
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    if (appt.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this appointment' });
    }
    if (!['pending', 'approved'].includes(appt.status)) {
      return res.status(400).json({ message: `Cannot reject an appointment with status: ${appt.status}` });
    }

    appt.status              = 'rejected';
    appt.rejectionReasonType = rejectionReasonType;
    appt.rejectionReason     = rejectionReasonType === 'Other' ? rejectionReason.trim() : rejectionReasonType;
    appt.rejectedBy          = req.user._id;
    appt.rejectedAt          = new Date();
    await appt.save();

    // Re-fetch with populated rejectedBy for the response
    const populated = await Appointment.findById(appt._id).populate('rejectedBy', 'fullName').lean();
    return res.status(200).json({ message: 'Appointment rejected', appointment: populated });
  } catch (error) {
    console.error('rejectAppointment:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PATCH /api/appointments/:id/complete
// @access  doctor
const completeAppointment = async (req, res) => {
  try {
    const { notes } = req.body;
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    if (appt.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (appt.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved appointments can be marked complete' });
    }

    appt.status      = 'completed';
    appt.completedAt = new Date();
    if (notes) appt.notes = notes;
    await appt.save();

    return res.status(200).json({ message: 'Appointment completed', appointment: appt });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PATCH /api/appointments/:id/cancel
// @access  receptionist | administrator
const cancelAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
    }

    appt.status = 'cancelled';
    await appt.save();

    return res.status(200).json({ message: 'Appointment cancelled', appointment: appt });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PATCH /api/appointments/:id/reschedule
// @access  receptionist | administrator
const rescheduleAppointment = async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    if (!date || !timeSlot) return res.status(400).json({ message: 'New date and time slot are required' });

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status === 'completed') {
      return res.status(400).json({ message: 'Cannot reschedule a completed appointment' });
    }

    appt.rescheduledDate     = appt.date;
    appt.rescheduledTimeSlot = appt.timeSlot;
    appt.rescheduledBy       = req.user._id;
    appt.rescheduledAt       = new Date();
    appt.date     = new Date(date);
    appt.timeSlot = timeSlot;
    appt.status   = 'pending'; // resets to pending after reschedule
    await appt.save();

    return res.status(200).json({ message: 'Appointment rescheduled', appointment: appt });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  GET /api/appointments/stats   (admin)
const getAppointmentStats = async (req, res) => {
  try {
    const [statusBreakdown, rejectionBreakdown, doctorStats] = await Promise.all([
      // Appointment counts by status
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Rejection reasons breakdown
      Appointment.aggregate([
        { $match: { status: 'rejected', rejectionReasonType: { $exists: true } } },
        { $group: { _id: '$rejectionReasonType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Doctor performance
      Appointment.aggregate([
        { $group: {
          _id:       '$doctorName',
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rejected:  { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          pending:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        }},
        { $sort: { total: -1 } },
      ]),
    ]);

    return res.status(200).json({ statusBreakdown, rejectionBreakdown, doctorStats });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export {
  getAppointments, getAppointment, createAppointment,
  approveAppointment, rejectAppointment, completeAppointment,
  cancelAppointment, rescheduleAppointment, getAppointmentStats,
};
