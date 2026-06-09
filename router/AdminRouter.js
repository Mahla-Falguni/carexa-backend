const express = require('express');
const Router = express.Router();

const adminAuth = require('../middleware/adminAuth');


const { createAdmin, adminLogin, updateAdminProfile, getHospitalById, getHospitalEmployeesById,
    getAllAppointmentSlots, getDashboardStats, getAllHospitals, getAllDoctors,
    getDoctorById, updateHospital, deleteHospital, deleteDoctor, getAdminProfile,
    changeAdminPassword, getAllAppointments, deleteAppointment, getPendingAppointments,
    approveAppointment, rejectAppointment, getRescheduleRequests, approveRescheduleRequest,
    rejectRescheduleRequest, 
    toggleHospitalStatus,
    adminForgotPassword,
    adminVerifyResetToken,
    adminResetPassword} = require('../controller/Admin/AdminController');
const { getHospitalRequests, approveHospitalRequest, rejectHospitalRequest } = require('../controller/Guest/GuestController');


// http://localhost:5000/adminapi/create_admin
Router.post('/create_admin', createAdmin)

// http://localhost:5000/adminapi/admin_login
Router.post('/admin_login', adminLogin)

// http://localhost:5000/adminapi/forgot-password
Router.post('/forgot-password', adminForgotPassword);

// http://localhost:5000/adminapi/verify-reset-token/:token
Router.get('/verify-reset-token/:token', adminVerifyResetToken);

// http://localhost:5000/adminapi/reset-password/:token
Router.post('/reset-password/:token', adminResetPassword);

// http://localhost:5000/adminapi/get-admin-profile
Router.get('/get-admin-profile', adminAuth, getAdminProfile);

// http://localhost:5000/adminapi/update-admin-profile
Router.post('/update-admin-profile', adminAuth, updateAdminProfile);

// http://localhost:5000/adminapi/change-admin-password
Router.post('/change-admin-password', adminAuth, changeAdminPassword);

// http://localhost:5000/adminapi/get_hospitals
Router.get('/get_hospitals', adminAuth, getAllHospitals)

// http://localhost:5000/adminapi/HospitalRequests
Router.get('/HospitalRequests', adminAuth, getHospitalRequests)

// http://localhost:5000/adminapi/get_hospitals_by_Id/:id
Router.get('/get_hospitals_by_Id/:id', adminAuth, getHospitalById)

// http://localhost:5000/adminapi/update-hospital/:id
Router.post('/update-hospital/:id', adminAuth, updateHospital);

// http://localhost:5000/adminapi/delete-hospital/:id
Router.delete('/delete-hospital/:id', adminAuth, deleteHospital);

// http://localhost:5000/adminapi/approve_hospital_request/:id
Router.post('/approve_hospital_request/:id', adminAuth, approveHospitalRequest)

// http://localhost:5000/adminapi/reject_hospital_request/:id
Router.post('/reject_hospital_request/:id', adminAuth, rejectHospitalRequest)

// http://localhost:5000/adminapi/get_doctors
Router.get('/get_doctors', adminAuth, getAllDoctors)

// http://localhost:5000/adminapi/delete-doctor/:id
Router.delete('/delete-doctor/:id', adminAuth, deleteDoctor);

// http://localhost:5000/adminapi/get_doctors/:id
Router.get('/get_doctors/:id', adminAuth, getDoctorById)

// http://localhost:5000/adminapi/get_hospital_employees/:hospitalId
Router.get('/get_hospital_employees/:hospitalId', adminAuth, getHospitalEmployeesById)

// http://localhost:5000/adminapi/All-Appointment-Slots
Router.get('/All-Appointment-Slots', adminAuth, getAllAppointmentSlots)

// http://localhost:5000/adminapi/Dashboard-status
Router.get('/Dashboard-status', adminAuth, getDashboardStats)

// http://localhost:5000/adminapi/all-appointments
Router.get('/all-appointments', adminAuth, getAllAppointments);

// http://localhost:5000/adminapi/delete-appointment/:id
Router.delete('/delete-appointment/:id', adminAuth, deleteAppointment);

// http://localhost:5000/adminapi/pending-appointments
Router.get('/pending-appointments', adminAuth, getPendingAppointments);

// http://localhost:5000/adminapi/approve-appointment/:id
Router.put('/approve-appointment/:id', adminAuth, approveAppointment);

// http://localhost:5000/adminapi/reject-appointment/:id
Router.put('/reject-appointment/:id', adminAuth, rejectAppointment);

// http://localhost:5000/adminapi/reschedule-requests
Router.get('/reschedule-requests', adminAuth, getRescheduleRequests);

// http://localhost:5000/adminapi/approve-reschedule
Router.post('/approve-reschedule', adminAuth, approveRescheduleRequest);

// http://localhost:5000/adminapi/reject-reschedule/:id
Router.put('/reject-reschedule/:id', adminAuth, rejectRescheduleRequest);

// http://localhost:5000/adminapi/toggle-hospital-status/:id
Router.put('/toggle-hospital-status/:id', adminAuth, toggleHospitalStatus);




module.exports = Router