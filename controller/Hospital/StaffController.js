require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HospitalStaffModel = require('../../model/HospitalStaffModel');
const AppointmentSlotsModel = require('../../model/AppointmentSlotsModel');
const AppointmentModel = require('../../model/AppointmentModel');
const PatientCaseHistoryModel = require('../../model/PatientCaseHistoryModel');
const RescheduleRequestModel = require('../../model/RescheduleRequestModel');
const PatientVisitModel = require('../../model/PatientVisitModel');
const FeedbackModel = require('../../model/FeedbackModel');
const PaymentModel = require('../../model/PaymentModel');

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — role guard
// ─────────────────────────────────────────────────────────────────────────────
const allowRoles = (roles, req, res) => {
    if (!roles.includes(req.staffRole)) {
        res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}` });
        return false;
    }
    return true;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC — no staffAuth needed
// ═══════════════════════════════════════════════════════════════════════════════

// POST /staffapi/staff-login
exports.staffLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required' });

        const staff = await HospitalStaffModel.findOne({ email })
            .populate('hospital_id', 'hospital_name hospital_address hospital_phone');

        if (!staff)
            return res.status(401).json({ message: 'No account found with this email' });
        if (staff.status === 'INACTIVE')
            return res.status(403).json({ message: 'Your account is inactive. Contact your hospital admin.' });
        if (staff.status === 'SUSPENDED')
            return res.status(403).json({ message: 'Your account has been suspended. Contact your hospital admin.' });

        if (!staff.password) {
            return res.status(200).json({
                requiresPasswordSetup: true,
                staffId: staff._id,
                message: 'Please create your password to continue.'
            });
        }

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch)
            return res.status(401).json({ message: 'Incorrect password' });

        const token = jwt.sign(
            { id: staff._id, role: staff.role, hospitalId: staff.hospital_id?._id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Login successful', token,
            staff: {
                _id: staff._id, name: staff.name, email: staff.email,
                phone: staff.phone, role: staff.role,
                specialization: staff.specialization, img: staff.img,
                status: staff.status, hospital: staff.hospital_id,
            }
        });
    } catch (error) {
        console.error('Staff Login Error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

// POST /staffapi/set-password
exports.setOwnPassword = async (req, res) => {
    try {
        const { staffId, newPassword, confirmPassword } = req.body;
        if (!staffId || !newPassword || !confirmPassword)
            return res.status(400).json({ message: 'All fields are required' });
        if (newPassword !== confirmPassword)
            return res.status(400).json({ message: 'Passwords do not match' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const staff = await HospitalStaffModel.findById(staffId);
        if (!staff)
            return res.status(404).json({ message: 'Staff account not found' });
        if (['INACTIVE', 'SUSPENDED'].includes(staff.status))
            return res.status(403).json({ message: 'Your account is not active. Contact your hospital admin.' });

        staff.password = await bcrypt.hash(newPassword, 10);
        await staff.save();

        const token = jwt.sign(
            { id: staff._id, role: staff.role, hospitalId: staff.hospital_id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        const populated = await HospitalStaffModel.findById(staff._id)
            .select('-password')
            .populate('hospital_id', 'hospital_name hospital_address hospital_phone');

        res.status(200).json({
            message: 'Password created successfully', token,
            staff: {
                _id: populated._id, name: populated.name, email: populated.email,
                phone: populated.phone, role: populated.role,
                specialization: populated.specialization, img: populated.img,
                status: populated.status, hospital: populated.hospital_id,
            }
        });
    } catch (error) {
        console.error('Set Password Error:', error);
        res.status(500).json({ message: 'Failed to set password', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ANY ROLE — staffAuth required
// ═══════════════════════════════════════════════════════════════════════════════

// GET /staffapi/staff-profile
exports.getStaffProfile = async (req, res) => {
    try {
        const staff = await HospitalStaffModel.findById(req.staffId)
            .select('-password')
            .populate('hospital_id', 'hospital_name hospital_address hospital_phone hospital_email');
        if (!staff) return res.status(404).json({ message: 'Staff not found' });
        res.status(200).json({ staff });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

// PUT /staffapi/update-own-profile
exports.updateOwnProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const staff = await HospitalStaffModel.findById(req.staffId);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });
        if (name) staff.name = name;
        if (phone) staff.phone = phone;
        if (req.file) staff.img = req.file.filename;
        await staff.save();
        res.status(200).json({ message: 'Profile updated successfully', staff });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// POST /staffapi/change-password
exports.changeStaffPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword)
            return res.status(400).json({ message: 'All fields are required' });
        if (newPassword !== confirmPassword)
            return res.status(400).json({ message: 'New passwords do not match' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const staff = await HospitalStaffModel.findById(req.staffId);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });

        const isMatch = await bcrypt.compare(currentPassword, staff.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        staff.password = await bcrypt.hash(newPassword, 10);
        await staff.save();
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};

// GET /staffapi/my-dashboard
exports.getStaffDashboard = async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        if (req.staffRole === 'DOCTOR') {
            const [totalAssigned, totalPending, totalScheduled, totalCompleted, totalCancelled, totalSlots, totalAvailableSlots] =
                await Promise.all([
                    AppointmentModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId }),
                    AppointmentModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId, appointment_status: 'PENDING' }),
                    AppointmentModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId, appointment_status: 'SCHEDULED' }),
                    AppointmentModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId, appointment_status: 'COMPLETED' }),
                    AppointmentModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId, appointment_status: 'CANCELLED' }),
                    AppointmentSlotsModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId }),
                    AppointmentSlotsModel.countDocuments({ doctor_id: req.staffId, hospital_id: req.staffHospitalId, slot_status: 'AVAILABLE' }),
                ]);
            const todayAppointments = await AppointmentModel.find({
                doctor_id: req.staffId, hospital_id: req.staffHospitalId,
                appointment_date: { $gte: today, $lt: tomorrow }
            }).populate('patient_id', 'patient_name patient_email patient_phone').sort({ start_time: 1 });

            return res.status(200).json({
                message: 'Doctor dashboard fetched', role: 'DOCTOR',
                stats: { totalAssigned, totalPending, totalScheduled, totalCompleted, totalCancelled, totalSlots, totalAvailableSlots },
                todayAppointments
            });
        }

        if (req.staffRole === 'RECEPTIONIST') {
            const [totalAppointments, totalPending, totalScheduled, totalCompleted, totalRescheduleRequests] =
                await Promise.all([
                    AppointmentModel.countDocuments({ hospital_id: req.staffHospitalId }),
                    AppointmentModel.countDocuments({ hospital_id: req.staffHospitalId, appointment_status: 'PENDING' }),
                    AppointmentModel.countDocuments({ hospital_id: req.staffHospitalId, appointment_status: 'SCHEDULED' }),
                    AppointmentModel.countDocuments({ hospital_id: req.staffHospitalId, appointment_status: 'COMPLETED' }),
                    RescheduleRequestModel.countDocuments({ status: 'PENDING' }),
                ]);
            const todayAppointments = await AppointmentModel.find({
                hospital_id: req.staffHospitalId,
                appointment_date: { $gte: today, $lt: tomorrow }
            }).populate('doctor_id', 'name specialization').populate('patient_id', 'patient_name patient_email patient_phone').sort({ start_time: 1 });

            return res.status(200).json({
                message: 'Receptionist dashboard fetched', role: 'RECEPTIONIST',
                stats: { totalAppointments, totalPending, totalScheduled, totalCompleted, totalRescheduleRequests },
                todayAppointments
            });
        }

        return res.status(200).json({ message: `Dashboard for role ${req.staffRole}`, role: req.staffRole });
    } catch (error) {
        console.error('Staff Dashboard Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DOCTOR ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

exports.getMyAppointments = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const appointments = await AppointmentModel.find({
            doctor_id: req.staffId, hospital_id: req.staffHospitalId
        }).populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('hospital_id', 'hospital_name hospital_address')
            .sort({ appointment_date: 1, start_time: 1 });
        res.status(200).json({ message: 'Appointments fetched successfully', total: appointments.length, appointments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointments', error: error.message });
    }
};

exports.getMyTodayAppointments = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const appointments = await AppointmentModel.find({
            doctor_id: req.staffId, hospital_id: req.staffHospitalId,
            appointment_date: { $gte: today, $lt: tomorrow }
        }).populate('patient_id', 'patient_name patient_email patient_phone').sort({ start_time: 1 });
        res.status(200).json({ message: "Today's appointments fetched", total: appointments.length, appointments });
    } catch (error) {
        res.status(500).json({ message: "Error fetching today's appointments", error: error.message });
    }
};

exports.markAppointmentComplete = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const appointment = await AppointmentModel.findOne({
            _id: req.params.id, doctor_id: req.staffId, hospital_id: req.staffHospitalId
        });
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        if (!['SCHEDULED', 'RESCHEDULED'].includes(appointment.appointment_status))
            return res.status(400).json({ message: 'Only scheduled appointments can be marked complete' });
        appointment.appointment_status = 'COMPLETED';
        await appointment.save();
        res.status(200).json({ message: 'Appointment marked as completed', appointment });
    } catch (error) {
        res.status(500).json({ message: 'Error completing appointment', error: error.message });
    }
};

exports.getMySlots = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const slots = await AppointmentSlotsModel.find({
            doctor_id: req.staffId, hospital_id: req.staffHospitalId
        }).populate('booked_by', 'patient_name patient_email patient_phone').sort({ appointment_date: 1, start_time: 1 });
        res.status(200).json({ message: 'Slots fetched successfully', total: slots.length, slots });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching slots', error: error.message });
    }
};

exports.addCaseHistory = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const { patient_id, appointmentId, appointment_id, diagnosis, medications, notes } = req.body;
        const apptId = appointmentId || appointment_id;
        if (!patient_id || !apptId || !diagnosis || !medications)
            return res.status(400).json({ message: 'patient_id, appointmentId, diagnosis and medications are required' });
        const appointment = await AppointmentModel.findOne({ _id: apptId, doctor_id: req.staffId, hospital_id: req.staffHospitalId });
        if (!appointment) return res.status(403).json({ message: 'Appointment not found or does not belong to you' });
        const medicalHistory = new PatientCaseHistoryModel({
            patient_id, appointment_id: apptId, doctor_id: req.staffId, hospital_id: req.staffHospitalId, diagnosis, medications, notes
        });
        await medicalHistory.save();
        res.status(201).json({ message: 'Case history added successfully', medicalHistory });
    } catch (error) {
        res.status(500).json({ message: 'Error adding case history', error: error.message });
    }
};

exports.updateCaseHistory = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const { historyId, diagnosis, medications, notes } = req.body;
        const history = await PatientCaseHistoryModel.findOne({ _id: historyId, doctor_id: req.staffId, hospital_id: req.staffHospitalId });
        if (!history) return res.status(404).json({ message: 'Case history not found or access denied' });
        if (diagnosis !== undefined) history.diagnosis = diagnosis;
        if (medications !== undefined) history.medications = medications;
        if (notes !== undefined) history.notes = notes;
        await history.save();
        res.status(200).json({ message: 'Case history updated successfully', history });
    } catch (error) {
        res.status(500).json({ message: 'Error updating case history', error: error.message });
    }
};

exports.getPatientHistory = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const histories = await PatientCaseHistoryModel.find({ patient_id: req.params.patientId, hospital_id: req.staffHospitalId })
            .populate('doctor_id', 'name specialization')
            .populate('appointment_id', 'appointment_date start_time')
            .sort({ createdAt: -1 });
        res.status(200).json({ message: 'Patient history fetched', total: histories.length, histories });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patient history', error: error.message });
    }
};

exports.getMyCaseHistories = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const histories = await PatientCaseHistoryModel.find({ doctor_id: req.staffId, hospital_id: req.staffHospitalId })
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('appointment_id', 'appointment_date start_time')
            .sort({ createdAt: -1 });
        res.status(200).json({ message: 'Case histories fetched', total: histories.length, histories });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching case histories', error: error.message });
    }
};

exports.getMyRescheduleRequests = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        // Get only appointment IDs belonging to this logged-in doctor
        const myAppointmentIds = await AppointmentModel.find({
            doctor_id: req.staffId,
            hospital_id: req.staffHospitalId
        }).distinct('_id');

        if (myAppointmentIds.length === 0) {
            return res.status(200).json({
                message: 'No reschedule requests found',
                total: 0,
                rescheduleRequests: []
            });
        }

        // Find reschedule requests only for those appointments
        const requests = await RescheduleRequestModel.find({
            appointment_id: { $in: myAppointmentIds }
        })
            .populate({
                path: 'appointment_id',
                populate: [
                    { path: 'patient_id', select: 'patient_name patient_email patient_phone' },
                    { path: 'doctor_id', select: 'name specialization' },
                    { path: 'hospital_id', select: 'hospital_name' },
                ]
            })
            .populate('requested_by', 'patient_name patient_email')
            .sort({ createdAt: -1 });

        // Extra safety: only keep requests where doctor_id matches logged-in doctor
        const filtered = requests.filter(r =>
            r.appointment_id?.doctor_id?._id?.toString() === req.staffId.toString()
        );

        res.status(200).json({
            message: 'Reschedule requests fetched',
            total: filtered.length,
            rescheduleRequests: filtered
        });

    } catch (error) {
        console.error('getMyRescheduleRequests error:', error);
        res.status(500).json({ message: 'Error fetching reschedule requests', error: error.message });
    }
};


exports.approveRescheduleRequest = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const request = await RescheduleRequestModel.findById(req.params.id)
            .populate('appointment_id');

        if (!request)
            return res.status(404).json({ message: 'Reschedule request not found' });

        // Verify this appointment belongs to the logged-in doctor
        if (request.appointment_id?.doctor_id?.toString() !== req.staffId.toString())
            return res.status(403).json({ message: 'Access denied. This request is not for your appointment.' });

        if (request.status !== 'PENDING')
            return res.status(400).json({ message: 'Request already processed' });

        request.status = 'APPROVED';
        await request.save();

        res.status(200).json({ message: 'Reschedule request approved', request });
    } catch (error) {
        console.error('approveRescheduleRequest error:', error);
        res.status(500).json({ message: 'Error approving request', error: error.message });
    }
};


exports.rejectRescheduleRequest = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const request = await RescheduleRequestModel.findById(req.params.id)
            .populate('appointment_id');

        if (!request)
            return res.status(404).json({ message: 'Reschedule request not found' });

        // Verify this appointment belongs to the logged-in doctor
        if (request.appointment_id?.doctor_id?.toString() !== req.staffId.toString())
            return res.status(403).json({ message: 'Access denied. This request is not for your appointment.' });

        if (request.status !== 'PENDING')
            return res.status(400).json({ message: 'Request already processed' });

        request.status = 'REJECTED';
        await request.save();

        res.status(200).json({ message: 'Reschedule request rejected', request });
    } catch (error) {
        console.error('rejectRescheduleRequest error:', error);
        res.status(500).json({ message: 'Error rejecting request', error: error.message });
    }
};

exports.getMyPatientVisits = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const visits = await PatientVisitModel.find({ doctor_id: req.staffId })
            .populate('patient_id', 'patient_name patient_email patient_phone').sort({ visit_date: -1 });
        res.status(200).json({ message: 'Patient visits fetched', total: visits.length, visits });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patient visits', error: error.message });
    }
};

exports.addPatientVisit = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const { patient_id, symptoms, diagnosis, treatment, visit_date } = req.body;
        if (!patient_id || !symptoms || !diagnosis || !treatment)
            return res.status(400).json({ message: 'patient_id, symptoms, diagnosis and treatment are required' });
        const visit = new PatientVisitModel({ patient_id, doctor_id: req.staffId, symptoms, diagnosis, treatment, visit_date: visit_date || new Date() });
        await visit.save();
        const populated = await PatientVisitModel.findById(visit._id).populate('patient_id', 'patient_name patient_email patient_phone');
        res.status(201).json({ message: 'Patient visit logged successfully', visit: populated });
    } catch (error) {
        res.status(500).json({ message: 'Error adding patient visit', error: error.message });
    }
};

exports.getMyFeedbacks = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const appointmentIds = await AppointmentModel.find({ doctor_id: req.staffId, hospital_id: req.staffHospitalId }).distinct('_id');
        const feedbacks = await FeedbackModel.find({ appointment_id: { $in: appointmentIds } })
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('appointment_id', 'appointment_date start_time').sort({ feedback_date: -1 });
        res.status(200).json({ message: 'Feedbacks fetched', total: feedbacks.length, feedbacks });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feedbacks', error: error.message });
    }
};

exports.getMyPayments = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const appointmentIds = await AppointmentModel.find({ doctor_id: req.staffId, hospital_id: req.staffHospitalId }).distinct('_id');
        const payments = await PaymentModel.find({ appointment_id: { $in: appointmentIds } })
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('appointment_id', 'appointment_date start_time').sort({ payment_date: -1 });
        res.status(200).json({ message: 'Payments fetched', total: payments.length, payments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  RECEPTIONIST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

exports.getAllAppointmentsForReception = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const appointments = await AppointmentModel.find({ hospital_id: req.staffHospitalId })
            .populate('doctor_id', 'name specialization').populate('patient_id', 'patient_name patient_email patient_phone')
            .sort({ appointment_date: -1 });
        res.status(200).json({ message: 'Appointments fetched', total: appointments.length, appointments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching appointments', error: error.message });
    }
};

exports.getPendingAppointmentsForReception = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const appointments = await AppointmentModel.find({ hospital_id: req.staffHospitalId, appointment_status: 'PENDING' })
            .populate('doctor_id', 'name specialization phone').populate('patient_id', 'patient_name patient_email patient_phone')
            .sort({ createdAt: -1 });
        res.status(200).json({ message: 'Pending appointments fetched', total: appointments.length, appointments });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending appointments', error: error.message });
    }
};

exports.getTodayAppointmentsForReception = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const appointments = await AppointmentModel.find({ hospital_id: req.staffHospitalId, appointment_date: { $gte: today, $lt: tomorrow } })
            .populate('doctor_id', 'name specialization').populate('patient_id', 'patient_name patient_email patient_phone')
            .sort({ start_time: 1 });
        res.status(200).json({ message: "Today's appointments fetched", total: appointments.length, appointments });
    } catch (error) {
        res.status(500).json({ message: "Error fetching today's appointments", error: error.message });
    }
};

exports.getRescheduleRequestsForReception = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const all = await RescheduleRequestModel.find()
            .populate({
                path: 'appointment_id', populate: [
                    { path: 'doctor_id', select: 'name specialization' },
                    { path: 'hospital_id', select: 'hospital_name' },
                    { path: 'patient_id', select: 'patient_name patient_email patient_phone' }
                ]
            })
            .populate('requested_by', 'patient_name patient_email').sort({ createdAt: -1 });
        const filtered = all.filter(r => r.appointment_id?.hospital_id?._id?.toString() === req.staffHospitalId.toString());
        res.status(200).json({ message: 'Reschedule requests fetched', total: filtered.length, rescheduleRequests: filtered });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reschedule requests', error: error.message });
    }
};

exports.getAvailableDoctorsForReception = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const doctors = await HospitalStaffModel.find({ hospital_id: req.staffHospitalId, role: 'DOCTOR', status: 'ACTIVE' });
        const doctorsWithSlots = await Promise.all(doctors.map(async doc => {
            const availableSlots = await AppointmentSlotsModel.find({
                doctor_id: doc._id, hospital_id: req.staffHospitalId,
                appointment_date: { $gte: today, $lt: tomorrow }, slot_status: 'AVAILABLE'
            }).select('start_time end_time');
            return { _id: doc._id, name: doc.name, specialization: doc.specialization, phone: doc.phone, img: doc.img, availableToday: availableSlots.length > 0, slots: availableSlots };
        }));
        res.status(200).json({ message: 'Doctors fetched', total: doctorsWithSlots.length, doctors: doctorsWithSlots });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available doctors', error: error.message });
    }
};



exports.getPatientCaseHistory = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const histories = await PatientCaseHistoryModel.find({
            patient_id: req.params.patientId,
            hospital_id: req.staffHospitalId,
        })
            .populate('appointment_id', 'appointment_date start_time end_time')
            .sort({ createdAt: -1 });
        res.status(200).json({ message: 'Patient case history fetched', total: histories.length, histories });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching case history', error: error.message });
    }
};

exports.getPatientVisits = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const visits = await PatientVisitModel.find({
            patient_id: req.params.patientId,
            doctor_id: req.staffId,
        }).sort({ visit_date: -1 });
        res.status(200).json({ message: 'Patient visits fetched', total: visits.length, visits });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patient visits', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SLOT HELPERS (exported for internal use)
// ═══════════════════════════════════════════════════════════════════════════════

exports.markSlotAsBooked = async (appointment, AppointmentSlotsModel) => {
    try {
        await AppointmentSlotsModel.findOneAndUpdate(
            { doctor_id: appointment.doctor_id, hospital_id: appointment.hospital_id, appointment_date: appointment.appointment_date, start_time: appointment.start_time, slot_status: 'AVAILABLE' },
            { slot_status: 'BOOKED', booked_by: appointment.patient_id }
        );
    } catch (err) { console.error('markSlotAsBooked error:', err.message); }
};

exports.markSlotAsAvailable = async (appointment, AppointmentSlotsModel) => {
    try {
        await AppointmentSlotsModel.findOneAndUpdate(
            { doctor_id: appointment.doctor_id, hospital_id: appointment.hospital_id, appointment_date: appointment.appointment_date, start_time: appointment.start_time },
            { slot_status: 'AVAILABLE', booked_by: null }
        );
    } catch (err) { console.error('markSlotAsAvailable error:', err.message); }
};




exports.bookFollowUpAppointment = async (req, res) => {
    if (!allowRoles(['DOCTOR'], req, res)) return;
    try {
        const { patient_id, slotId } = req.body;

        if (!patient_id || !slotId)
            return res.status(400).json({ message: "patient_id and slotId are required" });

        // 1. Find the slot — must belong to THIS doctor and be AVAILABLE
        const slot = await AppointmentSlotsModel.findOne({
            _id: slotId,
            doctor_id: req.staffId,
            hospital_id: req.staffHospitalId,
            slot_status: "AVAILABLE"
        });

        if (!slot)
            return res.status(404).json({ message: "Slot not found or already booked" });

        // 2. Check patient doesn't already have this slot booked
        const existing = await AppointmentModel.findOne({
            patient_id,
            doctor_id: req.staffId,
            hospital_id: req.staffHospitalId,
            appointment_date: slot.appointment_date,
            start_time: slot.start_time,
            appointment_status: { $in: ["SCHEDULED", "PENDING"] }
        });

        if (existing)
            return res.status(400).json({ message: "Patient already has an appointment at this time" });

        // 3. Atomically mark slot as BOOKED
        const bookedSlot = await AppointmentSlotsModel.findOneAndUpdate(
            { _id: slotId, slot_status: "AVAILABLE" },
            { $set: { slot_status: "BOOKED", booked_by: patient_id } },
            { new: true }
        );

        if (!bookedSlot)
            return res.status(400).json({ message: "Slot was just taken. Please choose another." });

        // 4. Create the appointment
        const appointment = await AppointmentModel.create({
            appointment_date: bookedSlot.appointment_date,
            start_time: bookedSlot.start_time,
            end_time: bookedSlot.end_time,
            patient_id,
            doctor_id: req.staffId,
            hospital_id: req.staffHospitalId,
            appointment_status: "SCHEDULED"
        });

        const populated = await AppointmentModel.findById(appointment._id)
            .populate("patient_id", "patient_name patient_email patient_phone")
            .populate("doctor_id", "name specialization")
            .populate("hospital_id", "hospital_name hospital_address");

        res.status(201).json({
            message: "Follow-up appointment booked successfully",
            appointment: populated
        });

    } catch (error) {
        console.error("bookFollowUpAppointment error:", error);
        res.status(500).json({ message: "Error booking follow-up appointment", error: error.message });
    }
};




// ─────────────────────────────────────────────────────────────────────────────
//  Receptionist records a manual payment (cash/UPI/card)
// ─────────────────────────────────────────────────────────────────────────────
exports.recordPayment = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const {
            appointment_id,
            amount,
            payment_method,   // "CASH" | "UPI" | "CARD" | "OTHER"
            upi_id,
            transaction_id,
            notes
        } = req.body;

        if (!appointment_id || !amount || !payment_method)
            return res.status(400).json({ message: 'appointment_id, amount and payment_method are required' });

        // Verify appointment belongs to this hospital
        const appointment = await AppointmentModel.findOne({
            _id: appointment_id,
            hospital_id: req.staffHospitalId
        })
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('doctor_id', 'name specialization consultation_fee')
            .populate('hospital_id', 'hospital_name hospital_address hospital_phone');

        if (!appointment)
            return res.status(404).json({ message: 'Appointment not found in this hospital' });

        // Check not already paid
        const existing = await PaymentModel.findOne({
            appointment_id,
            payment_status: 'PAID'
        });
        if (existing)
            return res.status(400).json({ message: 'Payment already recorded for this appointment' });

        // Record payment
        const payment = await PaymentModel.create({
            appointment_id,
            patient_id: appointment.patient_id._id,
            doctor_id: appointment.doctor_id._id,
            hospital_id: req.staffHospitalId,
            recorded_by: req.staffId,
            amount: Number(amount),
            payment_method,
            upi_id: upi_id || null,
            transaction_id: transaction_id || null,
            notes: notes || '',
            payment_status: 'PAID',
            payment_date: new Date()
        });

        // Optionally mark appointment as COMPLETED if it was SCHEDULED
        if (['SCHEDULED', 'RESCHEDULED'].includes(appointment.appointment_status)) {
            appointment.appointment_status = 'COMPLETED';
            await appointment.save();
        }

        // Return populated payment for receipt
        const populated = await PaymentModel.findById(payment._id)
            .populate('appointment_id', 'appointment_date start_time end_time appointment_status')
            .populate('patient_id', 'patient_name patient_email patient_phone patient_gender')
            .populate('doctor_id', 'name specialization consultation_fee')
            .populate('hospital_id', 'hospital_name hospital_address hospital_phone')
            .populate('recorded_by', 'name role');

        res.status(201).json({
            message: 'Payment recorded successfully',
            payment: populated,
            appointment: {
                ...appointment.toObject(),
                appointment_status: appointment.appointment_status
            }
        });

    } catch (error) {
        console.error('recordPayment error:', error);
        res.status(500).json({ message: 'Error recording payment', error: error.message });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  Receptionist views all payments recorded in their hospital
// ─────────────────────────────────────────────────────────────────────────────
exports.getHospitalPayments = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const payments = await PaymentModel.find({ hospital_id: req.staffHospitalId })
            .populate('appointment_id', 'appointment_date start_time end_time')
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('doctor_id', 'name specialization consultation_fee')
            .populate('recorded_by', 'name')
            .sort({ payment_date: -1 });

        res.status(200).json({
            message: 'Payments fetched',
            total: payments.length,
            payments
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  Check if an appointment already has a payment recorded
// ─────────────────────────────────────────────────────────────────────────────
exports.getAppointmentPayment = async (req, res) => {
    if (!allowRoles(['RECEPTIONIST'], req, res)) return;
    try {
        const payment = await PaymentModel.findOne({
            appointment_id: req.params.appointmentId,
            hospital_id: req.staffHospitalId
        })
            .populate('appointment_id', 'appointment_date start_time end_time')
            .populate('patient_id', 'patient_name patient_email patient_phone')
            .populate('doctor_id', 'name specialization consultation_fee')
            .populate('recorded_by', 'name');

        res.status(200).json({ payment: payment || null });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment', error: error.message });
    }
};




