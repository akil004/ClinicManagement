import MedicalRecord from '../models/MedicalRecord.js';

// @route  GET /api/medical-records
// @query  patientPhone | patientName
const getMedicalRecords = async (req, res) => {
  try {
    const { patientPhone, patientName } = req.query;
    const query = {};

    if (patientPhone) query.patientPhone = { $regex: patientPhone, $options: 'i' };
    if (patientName)  query.patientName  = { $regex: patientName,  $options: 'i' };

    const records = await MedicalRecord
      .find(query)
      .sort({ createdAt: -1 })
      .populate('doctorId', 'fullName')
      .lean();

    return res.status(200).json({ records });
  } catch (error) {
    console.error('getMedicalRecords:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  GET /api/medical-records/patient/:patientPhone
// Returns all records for a patient (identified by phone)
const getPatientHistory = async (req, res) => {
  try {
    const { patientPhone } = req.params;
    const records = await MedicalRecord
      .find({ patientPhone })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'fullName')
      .lean();

    // Aggregate history into a structured object
    const history = {
      patientInfo: records[0]
        ? {
            name:       records[0].patientName,
            age:        records[0].patientAge,
            gender:     records[0].patientGender,
            bloodGroup: records[0].patientBloodGroup,
            phone:      patientPhone,
            emergency:  records[0].emergencyContact,
          }
        : null,
      records,
      allAllergies:       [...new Set(records.flatMap((r) => r.allergies ?? []))],
      allChronicDiseases: [...new Set(records.flatMap((r) => r.chronicDiseases ?? []))],
      allSurgeries:       records.flatMap((r) => r.surgeries ?? []),
    };

    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  POST /api/medical-records
// @access  doctor
const createMedicalRecord = async (req, res) => {
  try {
    const {
      patientName, patientPhone, patientAge, patientGender, patientBloodGroup,
      appointmentId, diagnosis, prescription, labReports,
      allergies, chronicDiseases, surgeries, doctorNotes, emergencyContact,
    } = req.body;

    if (!patientName) return res.status(400).json({ message: 'Patient name is required' });

    const record = await MedicalRecord.create({
      patientName, patientPhone, patientAge, patientGender, patientBloodGroup,
      doctorId:   req.user._id,
      doctorName: req.user.fullName,
      appointmentId,
      diagnosis, prescription, labReports,
      allergies, chronicDiseases, surgeries, doctorNotes, emergencyContact,
    });

    return res.status(201).json({ message: 'Medical record created', record });
  } catch (error) {
    console.error('createMedicalRecord:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route  PUT /api/medical-records/:id
// @access  doctor
const updateMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Medical record not found' });

    if (record.doctorId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this record' });
    }

    Object.assign(record, req.body);
    await record.save();

    return res.status(200).json({ message: 'Medical record updated', record });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export { getMedicalRecords, getPatientHistory, createMedicalRecord, updateMedicalRecord };
