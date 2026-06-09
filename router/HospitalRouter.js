const express = require("express");
const router = express.Router();
const multer = require('multer');
const adminAuth = require("../middleware/adminAuth");
const {
    createHospital, getHospitalsByAdmin, LoginHospital,
    updateHospitalProfile, createHospitalAdmin,
    addDoctorEmployee, getaddedDoctorEmployee,
    updateDoctorProfile, createAppointmentSlots,
    getDoctorBookedAppointments, getRescheduleRequests, approveRescheduleRequest,
    addPatientHistory, updatePatientHistory, getAllPatientHistory,
    getDashboardStats, getAllDoctors, getAvailableDoctors,
    getAllBookedAppointments, getAllAppointmentSlots,
    deleteSlot, getSlot, updateSlot, deleteAppointment, getSlotsByDoctorAndDate,
    getHospitalProfile, changeHospitalPassword,
    getPendingAppointments,
    approveAppointment,
    rejectAppointment,
    rejectRescheduleRequest,
    subscribePlan,
    getMyPlan,
    cancelPlan,
    getAvailableAppointments,
    rescheduleAppointment,
    getHospitalFeedbacks,
    hospitalForgotPassword,
    hospitalVerifyResetToken,
    hospitalResetPassword,
    exportAppointmentsExcel,
} = require("../controller/Hospital/HospitalController");
const hospitalAuth = require("../middleware/hospitalAuth");
const uploads = require("../middleware/upload");
const { requestReschedule } = require("../controller/User/UserController");
const { getHospitalAdminPayments } = require("../controller/Payment/PaymentController");


// http://localhost:5000/hospitalapi/create
router.post("/create", adminAuth, uploads.single('hospital_img'), createHospital);

// http://localhost:5000/hospitalapi/loginHospital
router.post('/loginHospital', LoginHospital);

// http://localhost:5000/hospitalapi/forgot-password
router.post('/forgot-password', hospitalForgotPassword);

// http://localhost:5000/hospitalapi/verify-reset-token/:token
router.get('/verify-reset-token/:token', hospitalVerifyResetToken);

// http://localhost:5000/hospitalapi/reset-password/:token
router.post('/reset-password/:token', hospitalResetPassword);

// http://localhost:5000/hospitalapi/hospitals
router.get("/hospitals", adminAuth, getHospitalsByAdmin);

// http://localhost:5000/hospitalapi/update_profile
router.post('/update_profile', hospitalAuth, uploads.single('hospital_img'), updateHospitalProfile);

// http://localhost:5000/hospitalapi/get-hospital-profile
router.get('/get-hospital-profile', hospitalAuth, getHospitalProfile);

// http://localhost:5000/hospitalapi/update-hospital-profile
router.put('/update-hospital-profile', hospitalAuth, uploads.single('hospital_img'), updateHospitalProfile);

// http://localhost:5000/hospitalapi/change-hospital-password
router.put('/change-hospital-password', hospitalAuth, changeHospitalPassword);

// http://localhost:5000/hospitalapi/create-hospital-admin
router.post('/create-hospital-admin', adminAuth, createHospitalAdmin);

// http://localhost:5000/hospitalapi/add-doctor-employee
router.post('/add-doctor-employee', hospitalAuth, uploads.single('img'), addDoctorEmployee);

// http://localhost:5000/hospitalapi/update-doctor-profile/:id
router.post('/update-doctor-profile/:id', hospitalAuth, uploads.single('img'), updateDoctorProfile);

// http://localhost:5000/hospitalapi/getAllDoctors
router.get('/getAllDoctors', hospitalAuth, getAllDoctors);

// http://localhost:5000/hospitalapi/get-available-doctors
router.get('/get-available-doctors', hospitalAuth, getAvailableDoctors);

// http://localhost:5000/hospitalapi/Display-Doctors-Employees
router.get('/Display-Doctors-Employees', hospitalAuth, getaddedDoctorEmployee);

// http://localhost:5000/hospitalapi/get-doctors
router.get('/get-doctors', hospitalAuth, getAllDoctors);

// http://localhost:5000/hospitalapi/create-appointment-slots
router.post('/create-appointment-slots', hospitalAuth, createAppointmentSlots);

// http://localhost:5000/hospitalapi/get-slots-by-doctor
router.get("/get-slots-by-doctor", hospitalAuth, getSlotsByDoctorAndDate);

// http://localhost:5000/hospitalapi/get-slot/:id
router.get("/get-slot/:id", hospitalAuth, getSlot);

// http://localhost:5000/hospitalapi/update-slot/:id
router.post("/update-slot/:id", hospitalAuth, updateSlot);

// http://localhost:5000/hospitalapi/delete-slot/:id
router.delete('/delete-slot/:id', hospitalAuth, deleteSlot);

// http://localhost:5000/hospitalapi/get-appointment-slots
router.get("/get-appointment-slots", hospitalAuth, getAllAppointmentSlots);

// http://localhost:5000/hospitalapi/get-allbooked-appointments
router.get('/get-allbooked-appointments', hospitalAuth, getAllBookedAppointments);

// http://localhost:5000/hospitalapi/delete-appointment/:id
router.delete('/delete-appointment/:id', hospitalAuth, deleteAppointment);

// http://localhost:5000/hospitalapi/Booked-Slots/:hospital_id/:doctorId
router.get('/Booked-Slots/:hospital_id/:doctorId', hospitalAuth, getDoctorBookedAppointments);

// http://localhost:5000/hospitalapi/get-pending-appointments
router.get('/get-pending-appointments', hospitalAuth, getPendingAppointments);

// http://localhost:5000/hospitalapi/approve-appointment/:id
router.put('/approve-appointment/:id', hospitalAuth, approveAppointment);

// http://localhost:5000/hospitalapi/reject-appointment/:id
router.put('/reject-appointment/:id', hospitalAuth, rejectAppointment);

// http://localhost:5000/hospitalapi/reschedule-request
router.get('/reschedule-request', hospitalAuth, getRescheduleRequests);

// http://localhost:5000/hospitalapi/reschedule-appointment
router.post('/reschedule-appointment', hospitalAuth, approveRescheduleRequest);

// http://localhost:5000/hospitalapi/reject-reschedule/:id
router.post('/reject-reschedule/:id', hospitalAuth, rejectRescheduleRequest);

// http://localhost:5000/hospitalapi/add-patient-history
router.post('/add-patient-history', hospitalAuth, addPatientHistory);

// http://localhost:5000/hospitalapi/update-patient-history
router.post('/update-patient-history', hospitalAuth, updatePatientHistory);

// http://localhost:5000/hospitalapi/view-patient-history
router.get('/view-patient-history', hospitalAuth, getAllPatientHistory);

// http://localhost:5000/hospitalapi/get-Dashboard-Status
router.get('/get-Dashboard-Status', hospitalAuth, getDashboardStats);

// http://localhost:5000/hospitalapi/subscribe-plan
router.post('/subscribe-plan', hospitalAuth, subscribePlan);

// http://localhost:5000/hospitalapi/get-my-plan
router.get('/get-my-plan', hospitalAuth, getMyPlan);

// http://localhost:5000/hospitalapi/cancel-plan
router.put('/cancel-plan', hospitalAuth, cancelPlan);

// http://localhost:5000/hospitalapi/get-available-appointments
router.get('/get-available-appointments', hospitalAuth, getAvailableAppointments);

// http://localhost:5000/hospitalapi/reschedule-appointment
router.post('/reschedule-appointment', hospitalAuth, rescheduleAppointment);

// http://localhost:5000/hospitalapi/payments
router.get('/payments', hospitalAuth, getHospitalAdminPayments);

// http://localhost:5000/hospitalapi/feedbacks
router.get('/feedbacks', hospitalAuth, getHospitalFeedbacks);

// http://localhost:5000/hospitalapi/export-appointments-excel
router.get('/export-appointments-excel', hospitalAuth, exportAppointmentsExcel );


module.exports = router;