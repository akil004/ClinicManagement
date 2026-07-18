import User        from '../models/User.js';
import Appointment from '../models/Appointment.js';

// @route  GET /api/dashboard/admin
const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalDoctors, totalReceptionists, apptCounts, rejectionBreakdown, doctorStats,
      doctorsBySpecialization, availabilitySummary,
    ] = await Promise.all([
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'receptionist' }),
      Appointment.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { status: 'rejected', rejectionReasonType: { $exists: true } } },
        { $group: { _id: '$rejectionReasonType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Appointment.aggregate([
        { $group: {
          _id:            '$doctorName',
          total:          { $sum: 1 },
          completed:      { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rejected:       { $sum: { $cond: [{ $eq: ['$status', 'rejected']  }, 1, 0] } },
          completionRate: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        }},
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      // Doctors grouped by specialization
      User.aggregate([
        { $match: { role: 'doctor' } },
        { $group: { _id: { $ifNull: ['$specialization', 'Unassigned'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Doctor availability summary (Available / Busy / On Leave)
      User.aggregate([
        { $match: { role: 'doctor' } },
        { $group: { _id: '$availabilityStatus', count: { $sum: 1 } } },
      ]),
    ]);

    // Appointments per specialization — joins Appointment → doctor's User record.
    const appointmentsBySpecialization = await Appointment.aggregate([
      { $lookup: { from: 'users', localField: 'doctorId', foreignField: '_id', as: 'doctor' } },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$doctor.specialization', 'Unassigned'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const mostRequestedSpecialization = appointmentsBySpecialization[0]?._id ?? null;

    const countMap = Object.fromEntries(apptCounts.map(({ _id, count }) => [_id, count]));
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysCount = await Appointment.countDocuments({ date: { $gte: today } });

    return res.status(200).json({
      message: `Welcome, ${req.user.fullName}`,
      stats: {
        totalDoctors,
        totalReceptionists,
        totalPatients:        248,          // no Patient model yet — mock
        monthlyRevenue:       128500,       // mock
        todaysAppointments:   todaysCount,
        totalAppointments:    await Appointment.countDocuments(),
        pendingAppointments:  countMap.pending   ?? 0,
        approvedAppointments: countMap.approved  ?? 0,
        completedAppointments:countMap.completed ?? 0,
        rejectedAppointments: countMap.rejected  ?? 0,
      },
      rejectionBreakdown,
      doctorStats,
      doctorsBySpecialization,
      appointmentsBySpecialization,
      mostRequestedSpecialization,
      availabilitySummary,
    });
  } catch (error) {
    console.error('getAdminDashboard:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  GET /api/dashboard/doctor
const getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

    const [todayCount, completedCount, pendingCount, assignedCount, upcoming] = await Promise.all([
      Appointment.countDocuments({ doctorId, date: { $gte: today, $lte: todayEnd }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ doctorId, status: 'completed' }),
      Appointment.countDocuments({ doctorId, status: 'pending'   }),
      Appointment.countDocuments({ doctorId, status: { $in: ['pending', 'approved'] } }),
      Appointment.find({ doctorId, date: { $gte: today }, status: { $in: ['pending', 'approved'] } })
        .sort({ date: 1, timeSlot: 1 })
        .limit(10)
        .lean(),
    ]);

    return res.status(200).json({
      message: `Welcome, Dr. ${req.user.fullName}`,
      stats: {
        todaysAppointments:    todayCount,
        completedAppointments: completedCount,
        pendingAppointments:   pendingCount,
        assignedPatients:      assignedCount,
        department:            req.user.department ?? null,
        specialization:         req.user.specialization ?? null,
        availabilityStatus:     req.user.availabilityStatus ?? null,
      },
      upcomingSchedule: upcoming,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  GET /api/dashboard/reception
const getReceptionDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [todayAppts, pendingCount, totalAppts, rejectedToday]
= await Promise.all([
      Appointment.countDocuments({ date: { $gte: today }, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'rejected', rejectedAt: { $gte: today } }),
    ]);

    return res.status(200).json({
      message: `Welcome, ${req.user.fullName}`,
      stats: {
        todaysRegistrations:  7,             // mock
        todaysAppointments:   todayAppts,
        pendingBills:         9,             // mock
        registeredPatients:   248,           // mock
        pendingAppointments:  pendingCount,
        totalAppointments:    totalAppts,
        rejectedToday,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export { getAdminDashboard, getDoctorDashboard, getReceptionDashboard };
