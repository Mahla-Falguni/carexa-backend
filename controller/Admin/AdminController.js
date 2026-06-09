require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminModel = require('../../model/AdminModel');
const HospitalModel = require('../../model/HospitalModel');
const HospitalStaffModel = require('../../model/HospitalStaffModel');
const AppointmentSlotsModel = require('../../model/AppointmentSlotsModel');
const HospitalRequestModel = require('../../model/HospitalRequestModel');
const RescheduleRequestModel = require('../../model/RescheduleRequestModel');
const AppointmentModel = require('../../model/AppointmentModel');


exports.createAdmin = async (req, res) => {
    try {
        const { admin_name, admin_email, admin_pass } = req.body;

        if (!admin_name || !admin_email || !admin_pass) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingAdmin = await AdminModel.findOne({ admin_email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(admin_pass, 12);

        const admin = new AdminModel({
            admin_name,
            admin_email,
            admin_pass: hashedPassword
        });

        await admin.save();

        res.json({ message: 'Admin created successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


exports.adminLogin = async (req, res) => {
    try {
        const { admin_email, admin_pass } = req.body;

        if (!admin_email || !admin_pass) {
            return res.status(400).json({ message: "Email and Password are required" });
        }

        const admin = await AdminModel.findOne({ admin_email });

        if (!admin) {
            return res.status(401).json({ message: "Email is incorrect" });
        }

        const isMatch = await bcrypt.compare(admin_pass, admin.admin_pass);

        if (!isMatch) {
            return res.status(401).json({ message: "Password is incorrect" });
        }

        const token = jwt.sign(
            { id: admin._id },
            process.env.JWT_SECRET,
            { expiresIn: "6h" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                admin_email: admin.admin_email
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Login Failed", error: error.message });
    }
};



// GET ADMIN PROFILE
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await AdminModel.findById(req.adminId).select("-admin_pass");

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ admin });

    } catch (error) {
        res.status(500).json({ message: "Error fetching profile", error: error.message });
    }
};


// UPDATE ADMIN PROFILE
exports.updateAdminProfile = async (req, res) => {
    try {
        const { admin_name, admin_email, admin_phone } = req.body;

        const updated = await AdminModel.findByIdAndUpdate(
            req.adminId,
            { $set: { admin_name, admin_email, admin_phone } },
            { new: true }
        ).select("-admin_pass");

        if (!updated) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Profile updated successfully", admin: updated });

    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};


// CHANGE ADMIN PASSWORD
exports.changeAdminPassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return res.status(400).json({ message: "Both old and new passwords are required" });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const admin = await AdminModel.findById(req.adminId);

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(old_password, admin.admin_pass);

        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        const hashed = await bcrypt.hash(new_password, 12);

        await AdminModel.findByIdAndUpdate(req.adminId, { $set: { admin_pass: hashed } });

        res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error changing password", error: error.message });
    }
};


exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await HospitalModel.find();
        res.json({ hospitals });
    } catch (error) {
        res.status(500).json({ message: "Error fetching hospitals", error: error.message });
    }
};


exports.getHospitalById = async (req, res) => {
    try {
        const hospital = await HospitalModel.findById(req.params.id);

        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        res.json({ message: 'Hospital retrieved successfully', hospital });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving hospital', error: error.message });
    }
};


exports.updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { hospital_name, hospital_email, hospital_phone, hospital_address } = req.body;

        const updated = await HospitalModel.findByIdAndUpdate(
            id,
            { $set: { hospital_name, hospital_email, hospital_phone, hospital_address } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        res.status(200).json({ message: "Hospital updated successfully", hospital: updated });

    } catch (error) {
        res.status(500).json({ message: "Error updating hospital", error: error.message });
    }
};


exports.deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const hospital = await HospitalModel.findByIdAndDelete(id);

        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }

        res.status(200).json({ message: "Hospital deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error deleting hospital", error: error.message });
    }
};


exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await HospitalStaffModel.find({ role: 'DOCTOR' }).populate('hospital_id');
        res.json({ message: 'All doctors retrieved successfully', doctors });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving doctors', error: error.message });
    }
};


exports.deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await HospitalStaffModel.findByIdAndDelete(id);

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        res.status(200).json({ message: "Doctor deleted successfully" });

    } catch (error) {
        res.status(500).json({
            message: "Error deleting doctor",
            error: error.message
        });
    }
};


exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await HospitalStaffModel.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        res.json({ doctor });
    } catch (error) {
        res.status(500).json({ message: "Error fetching doctor", error: error.message });
    }
};


exports.getHospitalEmployeesById = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
            return res.status(400).json({ message: "Invalid Hospital ID" });
        }

        const employees = await HospitalStaffModel.find({
            hospital_id: new mongoose.Types.ObjectId(hospitalId)
        });

        return res.status(200).json({
            message: "Employees fetched successfully",
            total: employees.length,
            employees
        });

    } catch (error) {
        console.log("Fetch Employee Error:", error);
        return res.status(500).json({ message: "Error fetching employees", error: error.message });
    }
};


exports.getAllAppointmentSlots = async (req, res) => {
    try {
        const slots = await AppointmentSlotsModel.find().populate('doctor_id hospital_id');
        res.json({ message: 'All appointment slots retrieved successfully', slots });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving appointment slots', error: error.message });
    }
};


exports.getAllAppointments = async (req, res) => {
    const appointments = await AppointmentModel.find()
        .populate("patient_id", "patient_name patient_email patient_phone")
        .populate("doctor_id", "name specialization")
        .populate("hospital_id", "hospital_name")
        .sort({ createdAt: -1 });
    res.json({ appointments });
};

exports.deleteAppointment = async (req, res) => {
    await AppointmentModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
};


exports.getPendingAppointments = async (req, res) => {
    const appointments = await AppointmentModel.find({ appointment_status: "PENDING" })
        .populate("patient_id", "patient_name patient_email patient_phone")
        .populate("doctor_id", "name specialization")
        .populate("hospital_id", "hospital_name")
        .sort({ createdAt: -1 });
    res.json({ appointments });
};

exports.approveAppointment = async (req, res) => {
    await AppointmentModel.findByIdAndUpdate(req.params.id, { appointment_status: "SCHEDULED" });
    res.json({ message: "Approved" });
};

exports.rejectAppointment = async (req, res) => {
    await AppointmentModel.findByIdAndUpdate(req.params.id, { appointment_status: "CANCELLED" });
    res.json({ message: "Rejected" });
};


exports.getRescheduleRequests = async (req, res) => {
    try {
        // ✅ Admin sees ALL requests — no hospitalId filter needed
        const rescheduleRequests = await RescheduleRequestModel.find()
            .populate({
                path: "appointment_id",
                populate: [
                    { path: "doctor_id", select: "name specialization" },
                    { path: "hospital_id", select: "hospital_name" }
                ]
            })
            .sort({ createdAt: -1 });

        res.json({
            message: "Reschedule requests fetched successfully",
            total: rescheduleRequests.length,
            rescheduleRequests  // ✅ return all, no filter
        });

    } catch (error) {
        console.log("Fetch Reschedule Requests Error:", error.message);
        res.status(500).json({
            message: "Error fetching reschedule requests",
            error: error.message
        });
    }
};

exports.approveRescheduleRequest = async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ message: "Request ID is required" });
        }

        const request = await RescheduleRequestModel.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Reschedule request not found" });
        }

        if (request.status !== "PENDING") {
            return res.status(400).json({ message: "Request already processed" });
        }

        // ✅ Fixed: use appointment_status instead of status, and start_time instead of appointment_time
        const updatedAppointment = await AppointmentModel.findByIdAndUpdate(
            request.appointment_id,
            {
                $set: {
                    appointment_status: "RESCHEDULED"  // ✅ correct field name
                }
            },
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        request.status = "APPROVED";
        await request.save();

        res.status(200).json({
            message: "Reschedule request approved successfully",
            appointment: updatedAppointment
        });

    } catch (error) {
        res.status(500).json({ message: "Error approving reschedule request", error: error.message });
    }
};


exports.rejectRescheduleRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await RescheduleRequestModel.findById(id);

        if (!request) {
            return res.status(404).json({ message: "Reschedule request not found" });
        }

        if (request.status !== "PENDING") {
            return res.status(400).json({ message: "Request already processed" });
        }

        request.status = "REJECTED";
        await request.save();

        res.status(200).json({
            message: "Reschedule request rejected successfully",
            request
        });

    } catch (error) {
        res.status(500).json({
            message: "Error rejecting reschedule request",
            error: error.message
        });
    }
};


exports.getDashboardStats = async (req, res) => {
    try {
        const totalHospitals = await HospitalModel.countDocuments();
        const totalHospitalRequests = await HospitalRequestModel.countDocuments();
        const totalDoctors = await HospitalStaffModel.countDocuments({ role: 'DOCTOR' });
        const totalAppointments = await AppointmentModel.countDocuments({ appointment_status: "SCHEDULED" }); // ✅ fixed field name
        const totalAppointmentSlots = await AppointmentSlotsModel.countDocuments();
        const totalPendingAppointments = await AppointmentModel.countDocuments({ appointment_status: "PENDING" });   // ✅ fixed field name
        const totalRescheduleRequests = await RescheduleRequestModel.countDocuments({ status: "PENDING" });          // ✅ fixed field name

        res.json({
            message: 'Dashboard stats retrieved successfully',
            stats: {
                totalHospitals,
                totalHospitalRequests,
                totalDoctors,
                totalAppointments,
                totalAppointmentSlots,
                totalPendingAppointments,
                totalRescheduleRequests
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
    }
};


exports.toggleHospitalStatus = async (req, res) => {
    try {
        const { hospital_status } = req.body;
        const hospital = await HospitalModel.findByIdAndUpdate(
            req.params.id,
            { $set: { hospital_status } },
            { new: true }
        );
        res.json({ message: "Status updated", hospital });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};


// ── POST /adminapi/forgot-password ───────────────────────────────────────────
exports.adminForgotPassword = async (req, res) => {
    try {
        const { admin_email } = req.body;

        if (!admin_email)
            return res.status(400).json({ message: "Email is required" });

        const admin = await AdminModel.findOne({ admin_email: admin_email.toLowerCase().trim() });

        if (!admin)
            return res.status(404).json({ message: "No admin account found with this email" });

        // Generate 15-minute reset token
        const resetToken = jwt.sign(
            { id: admin._id, purpose: "admin_password_reset" },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Build the reset URL
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/reset-password/${resetToken}`;

        // ✅ Log to console — visible in your terminal
        console.log("\n====================================================");
        console.log("  🔐  ADMIN PASSWORD RESET LINK");
        console.log("====================================================");
        console.log(`  Admin : ${admin.admin_name} <${admin.admin_email}>`);
        console.log(`  Link  : ${resetUrl}`);
        console.log(`  Valid : 15 minutes`);
        console.log("====================================================\n");

        // Tell the frontend "sent to email" — no real email involved
        res.status(200).json({
            message: "Reset link sent to your email",
            // ⚠️  Only expose the token in development — remove in production
            ...(process.env.NODE_ENV !== "production" && { resetToken })
        });

    } catch (error) {
        console.error("adminForgotPassword error:", error);
        res.status(500).json({ message: "Error generating reset link", error: error.message });
    }
};


// ── GET /adminapi/verify-reset-token/:token ───────────────────────────────────
exports.adminVerifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError")
                return res.status(400).json({ valid: false, message: "Reset link has expired. Please request a new one." });
            return res.status(400).json({ valid: false, message: "Invalid reset link." });
        }

        if (decoded.purpose !== "admin_password_reset")
            return res.status(400).json({ valid: false, message: "Invalid token purpose." });

        const admin = await AdminModel.findById(decoded.id).select("admin_name admin_email");
        if (!admin)
            return res.status(404).json({ valid: false, message: "Admin not found." });

        res.status(200).json({ valid: true, admin_name: admin.admin_name });

    } catch (error) {
        res.status(500).json({ valid: false, message: "Server error" });
    }
};


// ── POST /adminapi/reset-password/:token ──────────────────────────────────────
exports.adminResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { new_password, confirm_password } = req.body;

        if (!token)
            return res.status(400).json({ message: "Reset token is required" });

        if (!new_password || !confirm_password)
            return res.status(400).json({ message: "Both password fields are required" });

        if (new_password !== confirm_password)
            return res.status(400).json({ message: "Passwords do not match" });

        if (new_password.length < 6)
            return res.status(400).json({ message: "Password must be at least 6 characters" });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError")
                return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
            return res.status(400).json({ message: "Invalid reset token" });
        }

        if (decoded.purpose !== "admin_password_reset")
            return res.status(400).json({ message: "Invalid token purpose" });

        const admin = await AdminModel.findById(decoded.id);
        if (!admin)
            return res.status(404).json({ message: "Admin not found" });

        admin.admin_pass = await bcrypt.hash(new_password, 12);
        await admin.save();

        console.log(`✅ Admin password reset successfully: ${admin.admin_email}`);

        res.status(200).json({ message: "Password reset successfully. You can now sign in." });

    } catch (error) {
        console.error("adminResetPassword error:", error);
        res.status(500).json({ message: "Error resetting password", error: error.message });
    }
};
