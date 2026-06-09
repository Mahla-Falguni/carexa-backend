const express   = require('express');
const router    = express.Router();
const staffAuth = require('../middleware/staffAuth');
const uploads   = require('../middleware/upload');

const {
    // ── Public (no staffAuth) ──────────────────────────────────────────────
    staffLogin,
    setOwnPassword,

    // ── Any role ──────────────────────────────────────────────────────────
    getStaffProfile,
    updateOwnProfile,
    changeStaffPassword,
    getStaffDashboard,

    // ── DOCTOR only ───────────────────────────────────────────────────────
    getMyAppointments,
    getMyTodayAppointments,
    markAppointmentComplete,
    getMySlots,
    addCaseHistory,
    updateCaseHistory,
    getPatientHistory,
    getMyCaseHistories,
    getMyRescheduleRequests,
    approveRescheduleRequest,
    rejectRescheduleRequest,
    getMyPayments,
    getMyFeedbacks,
    getMyPatientVisits,
    addPatientVisit,
    getPatientCaseHistory,
    addPatientCaseHistory,
    getPatientVisits,
    bookFollowUpAppointment,
    getAllAppointmentsForReception,
    recordPayment,
    getHospitalPayments,
    getAppointmentPayment,

} = require('../controller/Hospital/StaffController');
const { getDoctorPayments } = require('../controller/Payment/PaymentController');


// ─── PUBLIC (no token required) ──────────────────────────────────────────────
// http://localhost:5000/staffapi/staff-login
router.post('/staff-login', staffLogin);

// http://localhost:5000/staffapi/set-password
router.post('/set-password', setOwnPassword);


// ─── ANY ROLE (staffAuth required) ───────────────────────────────────────────
// http://localhost:5000/staffapi/staff-profile
router.get('/staff-profile', staffAuth, getStaffProfile);

// http://localhost:5000/staffapi/update-own-profile
router.put('/update-own-profile', staffAuth, uploads.single('img'), updateOwnProfile);

// http:// localhost:5000/staffapi/change-password
router.post('/change-password', staffAuth, changeStaffPassword);

// http://localhost:5000/staffapi/my-dashboard
router.get('/my-dashboard', staffAuth, getStaffDashboard);


// ─── DOCTOR ROUTES ───────────────────────────────────────────────────────────
// http://localhost:5000/staffapi/my-appointments
router.get('/my-appointments', staffAuth, getMyAppointments);

// http://localhost:5000/staffapi/my-appointments/today
router.get('/my-appointments/today', staffAuth, getMyTodayAppointments);

// http://localhost:5000/staffapi/appointment/complete/:id
router.patch('/appointment/complete/:id', staffAuth, markAppointmentComplete);

// http://localhost:5000/staffapi/my-slots
router.get('/my-slots', staffAuth, getMySlots);

// http://localhost:5000/staffapi/add-case-history
router.post('/add-case-history', staffAuth, addCaseHistory);

// http://localhost:5000/staffapi/update-case-history
router.put('/update-case-history', staffAuth, updateCaseHistory);

// http://localhost:5000/staffapi/patient-history/:patientId
router.get('/patient-history/:patientId', staffAuth, getPatientHistory);

// http://localhost:5000/staffapi/my-case-histories
router.get('/my-case-histories', staffAuth, getMyCaseHistories);

// http://localhost:5000/staffapi/my-reschedule-requests
router.get('/my-reschedule-requests', staffAuth, getMyRescheduleRequests);

// http://localhost:5000/staffapi/reschedule-request/:id/approved
router.patch('/reschedule-request/:id/approved', staffAuth, approveRescheduleRequest);

// http://localhost:5000/staffapi/reschedule-request/:id/rejected
router.patch('/reschedule-request/:id/rejected', staffAuth, rejectRescheduleRequest);

// http://localhost:5000/staffapi/my-payments
router.get('/my-payments', staffAuth, getMyPayments);

// http://localhost:5000/staffapi/my-feedbacks
router.get('/my-feedbacks', staffAuth, getMyFeedbacks);

// http://localhost:5000/staffapi/my-patient-visits
router.get('/my-patient-visits',  staffAuth, getMyPatientVisits);

// http://localhost:5000/staffapi/add-patient-visit
router.post('/add-patient-visit', staffAuth, addPatientVisit);

// http://localhost:5000/staffapi/patient-case-history/:patientId
router.get('/patient-case-history/:patientId', staffAuth, getPatientCaseHistory);

// http://localhost:5000/staffapi/patient-visits/:patientId
router.get('/patient-visits/:patientId', staffAuth, getPatientVisits);

// http://localhost:5000/staffapi/book-followup
router.post('/book-followup', staffAuth, bookFollowUpAppointment);






// ─── RECEPTIONIST ROUTES ───────────────────────────────────────────────────────────

// http://localhost:5000/staffapi/reception/all-appointments
router.get('/reception/all-appointments', staffAuth, getAllAppointmentsForReception);

// http://localhost:5000/staffapi/reception/record-payment
router.post('/reception/record-payment', staffAuth, recordPayment);

// http://localhost:5000/staffapi/reception/payments
router.get('/reception/payments', staffAuth, getHospitalPayments);

// http://localhost:5000/staffapi/reception/appointment-payment/:appointmentId
router.get('/reception/appointment-payment/:appointmentId', staffAuth, getAppointmentPayment);

// http://localhost:5000/staffapi/doctor/my-payments
router.get('/doctor/my-payments', staffAuth, getDoctorPayments);

module.exports = router;