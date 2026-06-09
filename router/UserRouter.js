const express = require('express');
const Router = express.Router()
const upload = require('../middleware/upload');

const { registerUser, updateUserProfile, getHospitals, getDoctorsByHospital, 
    getDoctorSlotsForUser, bookAppointment, requestReschedule,
    getMyAppointments,
    getUserProfile,
    changeUserPassword,
    getMyRescheduleRequests,
    cancelAppointment,
    getAvailableSlots,
    getHospitalDetails,
    getMyCaseHistories,
    getMyVisits,
    submitFeedback,
    getMyFeedbacks,
    canGiveFeedback,
    forgotPassword,
    verifyResetToken,
    resetPassword} 
    = require('../controller/User/UserController')
const { loginUser } = require('../controller/User/UserController');
const userAuth = require('../middleware/userAuth');

// ─── AUTH ────────────────────────────────────────────────────────────────────
Router.post('/register',                registerUser);
Router.post('/login',                   loginUser);
Router.post('/forgot-password',         forgotPassword);
Router.get( '/verify-reset-token/:token', verifyResetToken);
Router.post('/reset-password/:token',   resetPassword);

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
Router.get( '/get-profile',     userAuth, getUserProfile);
Router.post('/update-profile',  userAuth, upload.single('patient_img'), updateUserProfile);
Router.post('/change-password', userAuth, changeUserPassword);

// ─── HOSPITALS ────────────────────────────────────────────────────────────────
Router.get('/getHospitals',                    getHospitals);         
Router.get('/getHospitalDetails/:hospitalId',  userAuth, getHospitalDetails);

// ─── DOCTORS & SLOTS ─────────────────────────────────────────────────────────
Router.get('/getDoctors/:hospitalId',              userAuth, getDoctorsByHospital);
Router.get('/view-slots/:hospitalId/:doctorId',    userAuth, getDoctorSlotsForUser);
Router.get('/available-slots',                     userAuth, getAvailableSlots);

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
Router.post('/Book-Appointment',      userAuth, bookAppointment);
Router.get( '/MyAppointment',         userAuth, getMyAppointments);
Router.post('/cancel-appointment',    userAuth, cancelAppointment);

// ─── RESCHEDULE ───────────────────────────────────────────────────────────────
Router.post('/Request-Reschedule',    userAuth, requestReschedule);
Router.get( '/my-reschedule-requests',userAuth, getMyRescheduleRequests);

// ─── MEDICAL RECORDS ──────────────────────────────────────────────────────────
Router.get('/my-case-histories',      userAuth, getMyCaseHistories);
Router.get('/my-visits',              userAuth, getMyVisits);

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
Router.post('/submit-feedback',                    userAuth, submitFeedback);
Router.get( '/my-feedbacks',                       userAuth, getMyFeedbacks);
Router.get( '/can-give-feedback/:appointmentId',   userAuth, canGiveFeedback);

module.exports = Router;