require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const HospitalModel = require('../../model/HospitalModel');
const DoctorModel = require('../../model/HospitalStaffModel');
const AppointmentSlotsModel = require('../../model/AppointmentSlotsModel');
const HospitalStaffModel = require('../../model/HospitalStaffModel');
const RescheduleRequestModel = require('../../model/RescheduleRequestModel');
const AppointmentModel = require('../../model/AppointmentModel');
const PatientCaseHistoryModel = require('../../model/PatientCaseHistoryModel');
const HospitalPlanModel = require("../../model/HospitalPlanModel");
const HospitalSubscription = require("../../model/HospitalSubscriptionModel");
const FeedbackModel = require("../../model/FeedbackModel")
const generateAppointmentExcel = require("../../../Frontend/src/utilities/excelGenerator");


//  ADMIN CREATES HOSPITAL

exports.createHospital = async (req, res) => {
    try {
        const {
            hospital_name, hospital_email, hospital_pass: Password,
            hospital_address, hospital_phone, hospital_img, hospital_license
        } = req.body;

        if (!hospital_name || !hospital_email || !Password || !hospital_address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingHospital = await HospitalModel.findOne({ hospital_email });
        if (existingHospital) {
            return res.status(400).json({ message: 'Hospital already exists' });
        }

        const hashedPassword = await bcrypt.hash(Password, 12);
        const hospital = new HospitalModel({
            hospital_name, hospital_email, hospital_pass: hashedPassword,
            hospital_address, hospital_phone, hospital_img, hospital_license,
            created_by: req.adminId
        });
        await hospital.save();

        res.status(201).json({ message: 'Hospital created successfully', hospital });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


exports.getHospitalsByAdmin = async (req, res) => {
    try {
        const hospitals = await HospitalModel.find({ created_by: req.adminId });
        res.json({ message: "Hospitals fetched successfully", total: hospitals.length, hospitals });
    } catch (error) {
        res.json({ message: "Error fetching hospitals", error });
    }
};


exports.LoginHospital = async (req, res) => {
    try {
        const { hospital_email, hospital_pass } = req.body;

        if (!hospital_email || !hospital_pass) {
            return res.status(400).json({ message: "Email and Password are required" });
        }

        const hospital = await HospitalModel.findOne({ hospital_email });
        if (!hospital) {
            return res.status(401).json({ message: "Hospital email is incorrect" });
        }

        const isMatch = await bcrypt.compare(hospital_pass, hospital.hospital_pass);
        if (!isMatch) {
            return res.status(401).json({ message: "Password is incorrect" });
        }

        const token = jwt.sign({ id: hospital._id }, process.env.JWT_SECRET, { expiresIn: "6h" });

        res.status(200).json({
            message: "Login successful",
            token,
            hospital: {
                hospital_name: hospital.hospital_name,
                hospital_email: hospital.hospital_email
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};


exports.getHospitalProfile = async (req, res) => {
    try {
        const hospital = await HospitalModel.findById(req.hospitalId).select("-hospital_pass");
        if (!hospital) return res.status(404).json({ message: "Hospital not found" });
        res.status(200).json({ hospital });
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile", error: error.message });
    }
};


exports.updateHospitalProfile = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const { hospital_name, hospital_address, hospital_phone } = req.body;

        let updateData = { hospital_name, hospital_address, hospital_phone };
        if (req.file) updateData.hospital_img = req.file.filename;

        const updatedHospital = await HospitalModel.findByIdAndUpdate(
            hospitalId, updateData, { returnDocument: "after" }
        );

        if (!updatedHospital) return res.json({ message: "Hospital not found" });

        res.json({ message: "Profile updated successfully", hospital: updatedHospital });
    } catch (error) {
        res.json({ message: "Error updating profile", error: error.message });
    }
};


exports.changeHospitalPassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password)
            return res.status(400).json({ message: "Both old and new passwords are required" });

        if (new_password.length < 6)
            return res.status(400).json({ message: "New password must be at least 6 characters" });

        const hospital = await HospitalModel.findById(req.hospitalId);
        if (!hospital) return res.status(404).json({ message: "Hospital not found" });

        const isMatch = await bcrypt.compare(old_password, hospital.hospital_pass);
        if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

        const hashed = await bcrypt.hash(new_password, 12);
        await HospitalModel.findByIdAndUpdate(req.hospitalId, { $set: { hospital_pass: hashed } });

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error changing password", error: error.message });
    }
};


exports.createHospitalAdmin = async (req, res) => {
    try {
        const { hospital_email, hospital_pass, hospital_name, hospital_address } = req.body;

        if (!hospital_email || !hospital_pass || !hospital_name || !hospital_address)
            return res.json({ message: "All fields are required" });

        const existingHospital = await HospitalModel.findOne({ hospital_email });
        if (existingHospital) return res.json({ message: "Hospital already exists" });

        const hashedPassword = await bcrypt.hash(hospital_pass, 12);
        const hospital = new HospitalModel({
            hospital_email, hospital_pass: hashedPassword,
            hospital_name, hospital_address, created_by: req.adminId
        });
        await hospital.save();

        res.json({ message: "Hospital admin created successfully", hospital });
    } catch (error) {
        res.json({ message: "Error creating hospital admin", error: error.message });
    }
};


exports.addDoctorEmployee = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const { name, email, phone, specialization, consultation_fee, role } = req.body;

        if (!name || !email || !phone || !specialization || consultation_fee == null || !role)
            return res.json({ message: "All fields are required" });

        let imageName = null;
        if (req.file) imageName = req.file.filename;

        const doctor = new HospitalStaffModel({
            hospital_id: hospitalId,
            name, email, phone, specialization,
            consultation_fee, img: imageName, role
        });

        await doctor.save();
        res.json({ message: "Doctor OR employee is added successfully", doctor });
    } catch (error) {
        res.json({ message: "Error adding doctor employee", error: error.message });
    }
};


exports.updateDoctorProfile = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { name, email, phone, specialization, consultation_fee, role } = req.body;

        const doctor = await DoctorModel.findById(doctorId);
        if (!doctor) return res.json({ message: "Doctor not found" });

        doctor.name = name;
        doctor.email = email;
        doctor.phone = phone;
        doctor.specialization = specialization;
        doctor.consultation_fee = consultation_fee;
        doctor.role = role;

        if (req.file) doctor.img = req.file.filename;

        await doctor.save();
        res.json({ message: "Doctor profile updated successfully", doctor });
    } catch (error) {
        res.json({ message: "Error updating doctor profile", error: error.message });
    }
};


exports.getAllDoctors = async (req, res) => {
    const hospitalId = req.hospitalId;
    try {
        const doctors = await HospitalStaffModel.find({ hospital_id: hospitalId, role: "DOCTOR" });
        res.json({ message: "Doctors retrieved successfully", total: doctors.length, doctors });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving doctors", error: error.message });
    }
};


exports.getAvailableDoctors = async (req, res) => {
    const hospitalId = req.hospitalId;
    try {
        const doctors = await HospitalStaffModel.find({ hospital_id: hospitalId, role: "DOCTOR", status: "ACTIVE" });
        res.json({ message: "Available doctors retrieved", total: doctors.length, doctors });
    } catch (error) {
        res.status(500).json({ message: "Error fetching doctors", error: error.message });
    }
};


exports.getaddedDoctorEmployee = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        if (!hospitalId)
            return res.json({ message: "Unauthorized. Hospital ID not found in token." });

        const doctorsEmployees = await HospitalStaffModel.find({ hospital_id: hospitalId });

        if (!doctorsEmployees || doctorsEmployees.length === 0)
            return res.json({ message: "No doctors or employees found for this hospital." });

        res.json({
            message: "Doctors and employees fetched successfully",
            total: doctorsEmployees.length,
            doctorsEmployees
        });
    } catch (error) {
        res.json({ message: "Error fetching doctors and employees", error: error.message });
    }
};


exports.createAppointmentSlots = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const { appointment_date, start_time, end_time, doctor_id } = req.body;

        const existingSlot = await AppointmentSlotsModel.findOne({
            doctor_id, hospital_id: hospitalId, appointment_date, start_time, end_time
        });

        if (existingSlot)
            return res.status(400).json({ message: "This time slot already exists for the selected doctor." });

        let slot = await AppointmentSlotsModel.create({
            appointment_date, start_time, end_time, doctor_id, hospital_id: hospitalId
        });

        slot = await slot.populate([
            { path: "doctor_id", select: "name specialization phone" },
            { path: "hospital_id", select: "hospital_name hospital_address hospital_phone" }
        ]);

        res.status(201).json({ message: "Slot created successfully", slot });
    } catch (error) {
        res.status(500).json({ message: "Error creating slots", error: error.message });
    }
};


exports.getSlotsByDoctorAndDate = async (req, res) => {
    try {
        const { doctor_id, date } = req.query;
        const hospitalId = req.hospitalId;

        if (!doctor_id || !date)
            return res.status(400).json({ message: "doctor_id and date are required" });

        const slots = await AppointmentSlotsModel.find({
            doctor_id, hospital_id: hospitalId, appointment_date: new Date(date)
        }).select("start_time end_time");

        res.status(200).json({ slots });
    } catch (error) {
        res.status(500).json({ message: "Error fetching slots", error: error.message });
    }
};


exports.updateSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { appointment_date, start_time, end_time } = req.body;

        const slot = await AppointmentSlotsModel.findByIdAndUpdate(
            id, { appointment_date, start_time, end_time }, { returnDocument: "after" }
        );

        res.json({ message: "Slot updated successfully", slot });
    } catch (error) {
        res.json({ message: "Error updating slot", error: error.message });
    }
};


exports.deleteSlot = async (req, res) => {
    try {
        const { id } = req.params;
        await AppointmentSlotsModel.findByIdAndDelete(id);
        res.json({ message: "Slot deleted successfully" });
    } catch (error) {
        res.json({ message: "Error deleting slot", error: error.message });
    }
};


exports.getSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const slot = await AppointmentSlotsModel.findById(id);
        res.json({ slot });
    } catch (error) {
        res.json({ message: "Error fetching slot", error: error.message });
    }
};


exports.getAllAppointmentSlots = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const slots = await AppointmentSlotsModel.find({ hospital_id: hospitalId })
            .populate("doctor_id", "name specialization")
            .populate("hospital_id", "hospital_name");

        res.json({ message: "Slots fetched successfully", slots });
    } catch (error) {
        res.json({ message: "Error fetching slots", error: error.message });
    }
};


// ── GET AVAILABLE SLOTS FOR HOSPITAL (used by slot picker modal) ─────────────
exports.getAvailableAppointments = async (req, res) => {
    try {
        const { doctorId, hospitalId } = req.query;

        if (!doctorId) {
            return res.status(400).json({ message: "doctorId is required" });
        }

        const query = {
            doctor_id: doctorId,
            slot_status: "AVAILABLE"
        };

        if (hospitalId) query.hospital_id = hospitalId;

        const slots = await AppointmentSlotsModel.find(query)
            .sort({ appointment_date: 1, start_time: 1 })
            .select("start_time end_time appointment_date slot_status _id");

        res.status(200).json({ slots });
    } catch (error) {
        console.error("getAvailableAppointments error:", error);
        res.status(500).json({ message: "Error fetching available slots", error: error.message });
    }
};


exports.getAllBookedAppointments = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        if (!hospitalId)
            return res.status(400).json({ message: "Hospital ID not found in request" });

        const appointments = await AppointmentModel.find({ hospital_id: hospitalId })
            .populate("doctor_id", "name specialization")
            .populate("patient_id", "patient_name patient_email patient_phone")
            .populate("hospital_id", "hospital_name hospital_address");

        return res.status(200).json({
            message: "Appointments fetched successfully",
            total: appointments.length,
            appointments
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching appointments", error: error.message });
    }
};


exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        await AppointmentModel.findByIdAndDelete(id);
        res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting appointment", error: error.message });
    }
};


exports.getDoctorBookedAppointments = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const { doctorId } = req.params;

        if (!doctorId) return res.status(400).json({ message: "Doctor ID is required" });

        const doctor = await HospitalStaffModel.findOne({ _id: doctorId, hospital_id: hospitalId });
        if (!doctor) return res.status(403).json({ message: "Doctor not found in this hospital" });

        const appointments = await AppointmentSlotsModel.find({ doctor_id: doctorId, is_booked: true })
            .populate("booked_by", "patient_name patient_email patient_phone")
            .populate("hospital_id", "hospital_name hospital_address");

        res.status(200).json({
            message: "Doctor booked appointments fetched successfully",
            total: appointments.length,
            appointments
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching booked appointments", error: error.message });
    }
};


exports.getPendingAppointments = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        const appointments = await AppointmentModel.find({
            hospital_id: hospitalId,
            appointment_status: "PENDING"
        })
            .populate("patient_id", "patient_name patient_email patient_phone")
            .populate("doctor_id", "name specialization phone")
            .populate("hospital_id", "hospital_name hospital_address")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Pending appointments fetched successfully",
            total: appointments.length,
            appointments
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching pending appointments", error: error.message });
    }
};


exports.approveAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await AppointmentModel.findById(id);

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.appointment_status !== "PENDING")
            return res.status(400).json({ message: "Only pending appointments can be approved" });

        appointment.appointment_status = "SCHEDULED";
        await appointment.save();

        res.status(200).json({ message: "Appointment approved successfully", appointment });
    } catch (error) {
        res.status(500).json({ message: "Error approving appointment", error: error.message });
    }
};


exports.rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await AppointmentModel.findById(id);

        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.appointment_status !== "PENDING")
            return res.status(400).json({ message: "Only pending appointments can be rejected" });

        appointment.appointment_status = "CANCELLED";
        await appointment.save();

        res.status(200).json({ message: "Appointment rejected successfully", appointment });
    } catch (error) {
        res.status(500).json({ message: "Error rejecting appointment", error: error.message });
    }
};


// ── GET RESCHEDULE REQUESTS (FIXED) ──────────────────────────────────────────
exports.getRescheduleRequests = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        const rescheduleRequests = await RescheduleRequestModel.find()
            .populate({
                path: "appointment_id",
                populate: [
                    { path: "doctor_id", select: "name specialization" },
                    { path: "hospital_id", select: "hospital_name hospital_address" },
                    { path: "patient_id", select: "patient_name patient_email patient_phone" }
                ]
            })
            .populate("requested_by", "patient_name patient_email patient_phone") // ← FIXED
            .sort({ createdAt: -1 });

        // Filter by hospitalId after populate
        const filtered = rescheduleRequests.filter(r =>
            r.appointment_id?.hospital_id?._id?.toString() === hospitalId.toString()
        );

        res.json({
            message: "Reschedule requests fetched successfully",
            total: filtered.length,
            rescheduleRequests: filtered
        });

    } catch (error) {
        console.log("Fetch Reschedule Requests Error:", error.message);
        res.status(500).json({ message: "Error fetching reschedule requests", error: error.message });
    }
};


exports.approveRescheduleRequest = async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) return res.status(400).json({ message: "Request ID is required" });

        const request = await RescheduleRequestModel.findById(requestId);
        if (!request) return res.status(404).json({ message: "Reschedule request not found" });
        if (request.status !== "PENDING") return res.status(400).json({ message: "Request already processed" });

        const updatedAppointment = await AppointmentModel.findByIdAndUpdate(
            request.appointment_id,
            { $set: { appointment_status: "RESCHEDULED" } },
            { new: true }
        );

        if (!updatedAppointment) return res.status(404).json({ message: "Appointment not found" });

        request.status = "APPROVED";
        await request.save();

        res.status(200).json({ message: "Reschedule request approved successfully", appointment: updatedAppointment });
    } catch (error) {
        res.status(500).json({ message: "Error approving reschedule request", error: error.message });
    }
};


// ── RESCHEDULE APPOINTMENT WITH NEW SLOT (used by slot picker modal) ─────────
exports.rescheduleAppointment = async (req, res) => {
    try {
        const { requestId, newSlotId } = req.body;

        if (!requestId || !newSlotId)
            return res.status(400).json({ message: "requestId and newSlotId are required" });

        // 1. Find the reschedule request
        const request = await RescheduleRequestModel.findById(requestId);
        if (!request) return res.status(404).json({ message: "Reschedule request not found" });
        if (request.status !== "PENDING") return res.status(400).json({ message: "Request already processed" });

        // 2. Find the new slot and check it's still available
        const newSlot = await AppointmentSlotsModel.findById(newSlotId);
        if (!newSlot) return res.status(404).json({ message: "New slot not found" });
        if (newSlot.slot_status !== "AVAILABLE")
            return res.status(400).json({ message: "Selected slot is no longer available. Please choose another." });

        // 3. Find the original appointment
        const appointment = await AppointmentModel.findById(request.appointment_id);
        if (!appointment) return res.status(404).json({ message: "Original appointment not found" });

        // 4. Free up the OLD slot back to AVAILABLE
        await AppointmentSlotsModel.findOneAndUpdate(
            {
                doctor_id: appointment.doctor_id,
                hospital_id: appointment.hospital_id,
                appointment_date: appointment.appointment_date,
                start_time: appointment.start_time,
            },
            { $set: { slot_status: "AVAILABLE", booked_by: null } }
        );

        // 5. Book the NEW slot atomically
        const bookedNewSlot = await AppointmentSlotsModel.findOneAndUpdate(
            { _id: newSlotId, slot_status: "AVAILABLE" },
            { $set: { slot_status: "BOOKED", booked_by: appointment.patient_id } },
            { new: true }
        );

        if (!bookedNewSlot)
            return res.status(400).json({ message: "Slot was just taken. Please choose another." });

        // 6. Update the appointment with new date/time
        appointment.appointment_date = bookedNewSlot.appointment_date;
        appointment.start_time = bookedNewSlot.start_time;
        appointment.end_time = bookedNewSlot.end_time;
        appointment.appointment_status = "RESCHEDULED";
        await appointment.save();

        // 7. Mark reschedule request as APPROVED
        request.status = "APPROVED";
        await request.save();

        res.status(200).json({
            message: "Appointment rescheduled successfully",
            appointment,
            newSlot: bookedNewSlot
        });

    } catch (error) {
        console.error("rescheduleAppointment error:", error);
        res.status(500).json({ message: "Error rescheduling appointment", error: error.message });
    }
};


exports.rejectRescheduleRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await RescheduleRequestModel.findById(id);

        if (!request) return res.status(404).json({ message: "Reschedule request not found" });
        if (request.status !== "PENDING") return res.status(400).json({ message: "Request already processed" });

        request.status = "REJECTED";
        await request.save();

        res.status(200).json({ message: "Reschedule request rejected successfully", request });
    } catch (error) {
        res.status(500).json({ message: "Error rejecting reschedule request", error: error.message });
    }
};


exports.addPatientHistory = async (req, res) => {
    try {
        const { doctorId, patient_id, appointmentId, diagnosis, medications, notes } = req.body;

        if (!doctorId || !patient_id || !appointmentId || !diagnosis || !medications)
            return res.status(400).json({ message: "All fields are required" });

        const medicalHistory = new PatientCaseHistoryModel({
            patient_id, appointment_id: appointmentId, doctor_id: doctorId,
            hospital_id: req.hospitalId, diagnosis, medications, notes
        });

        await medicalHistory.save();
        res.status(201).json({ message: "Medical history added successfully", medicalHistory });
    } catch (error) {
        res.status(500).json({ message: "Error adding medical history", error: error.message });
    }
};


exports.updatePatientHistory = async (req, res) => {
    try {
        const { historyId, diagnosis, medications, notes } = req.body;
        const history = await PatientCaseHistoryModel.findById(historyId);

        if (!history) return res.status(404).json({ message: "Medical history record not found" });

        if (diagnosis !== undefined) history.diagnosis = diagnosis;
        if (medications !== undefined) history.medications = medications;
        if (notes !== undefined) history.notes = notes;

        await history.save();
        res.status(200).json({ message: "Medical history updated successfully", history });
    } catch (error) {
        res.status(500).json({ message: "Error updating medical history", error: error.message });
    }
};


exports.getAllPatientHistory = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        const histories = await PatientCaseHistoryModel.find({ hospital_id: hospitalId })
            .populate("patient_id", "patient_name patient_email patient_phone")
            .populate("doctor_id", "name specialization")
            .populate("appointment_id", "appointment_date appointment_time");

        res.status(200).json({ message: "Patient histories fetched successfully", total: histories.length, histories });
    } catch (error) {
        res.status(500).json({ message: "Error fetching patient histories", error: error.message });
    }
};



exports.subscribePlan = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;
        const { plan_id } = req.body;

        if (!plan_id) return res.status(400).json({ message: "plan_id is required" });

        await HospitalPlanModel.updateMany(
            { hospital_id: hospitalId },
            { $set: { status: "INACTIVE" } }
        );

        const subscription = new HospitalPlanModel({ hospital_id: hospitalId, plan_id, status: "ACTIVE" });
        await subscription.save();

        res.status(200).json({ message: "Plan subscribed successfully", subscription });
    } catch (error) {
        res.status(500).json({ message: "Error subscribing to plan", error: error.message });
    }
};




exports.getMyPlan = async (req, res) => {
    try {
        const hospital_id = req.hospitalId;

        // 1. Try to find an active, non-expired plan
        const activeSub = await HospitalSubscription
            .findOne({ hospital_id, status: "ACTIVE", expiry_date: { $gt: new Date() } })
            .populate("plan_id");

        if (activeSub) {
            return res.json({ subscription: activeSub, lastSubscription: null });
        }

        // 2. No active plan — find the most recent subscription regardless of status
        const lastSub = await HospitalSubscription
            .findOne({ hospital_id })
            .sort({ createdAt: -1 })          // most recent first
            .populate("plan_id");              // populate even if plan is INACTIVE

        // lastSub may exist but plan_id may be null if the plan was deleted
        return res.json({ subscription: null, lastSubscription: lastSub || null });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelPlan = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        // Cancel HospitalSubscription
        const updatedSub = await HospitalSubscription.findOneAndUpdate(
            { hospital_id: hospitalId, status: "ACTIVE" },
            { $set: { status: "INACTIVE" } },
            { new: true }
        );

        // Cancel HospitalPlanModel too
        await HospitalPlanModel.updateMany(
            { hospital_id: hospitalId, status: "ACTIVE" },
            { $set: { status: "INACTIVE" } }
        );

        console.log("Cancelled subscription:", updatedSub);

        if (!updatedSub) {
            return res.status(404).json({ message: "No active plan found to cancel" });
        }

        res.status(200).json({ message: "Plan cancelled successfully" });
    } catch (error) {
        console.log("Cancel plan error:", error);
        res.status(500).json({ message: "Error cancelling plan", error: error.message });
    }
};





exports.getDashboardStats = async (req, res) => {
    try {
        const hospitalId = req.hospitalId;

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        // ── Core counts ──────────────────────────────────────────────────────
        const totalDoctors = await HospitalStaffModel.countDocuments({
            hospital_id: hospitalId, role: "DOCTOR"
        });

        const totalAppointments = await AppointmentModel.countDocuments({
            hospital_id: hospitalId
        });

        const totalPendingAppointments = await AppointmentModel.countDocuments({
            hospital_id: hospitalId,
            appointment_status: "PENDING"
        });

        const totalScheduledAppointments = await AppointmentModel.countDocuments({
            hospital_id: hospitalId,
            appointment_status: "SCHEDULED"
        });

        const totalCompletedAppointments = await AppointmentModel.countDocuments({
            hospital_id: hospitalId,
            appointment_status: "COMPLETED"
        });

        const totalCancelledAppointments = await AppointmentModel.countDocuments({
            hospital_id: hospitalId,
            appointment_status: "CANCELLED"
        });

        const totalRescheduleRequests = await RescheduleRequestModel.countDocuments({});
        // Filter by hospital after — same approach as getRescheduleRequests

        const totalAppointmentSlots = await AppointmentSlotsModel.countDocuments({
            hospital_id: hospitalId
        });

        const totalAvailableSlots = await AppointmentSlotsModel.countDocuments({
            hospital_id: hospitalId,
            slot_status: "AVAILABLE"
        });

        // ── Today's appointments ─────────────────────────────────────────────
        const todayAppointmentsData = await AppointmentModel.find({
            hospital_id: hospitalId,
            appointment_date: { $gte: today, $lt: tomorrow }
        })
            .populate("doctor_id", "name specialization")
            .populate("patient_id", "patient_name patient_email patient_phone")
            .sort({ start_time: 1 })
            .limit(10);

        const todayAppointments = todayAppointmentsData.map(a => ({
            patient: a.patient_id?.patient_name || "Patient",
            patientEmail: a.patient_id?.patient_email || "",
            doctor: a.doctor_id?.name || "Doctor",
            specialization: a.doctor_id?.specialization || "",
            time: a.start_time,
            status: a.appointment_status
        }));

        // ── Weekly appointments chart ────────────────────────────────────────
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 6);
        last7Days.setHours(0, 0, 0, 0);

        const weeklyData = await AppointmentModel.aggregate([
            {
                $match: {
                    hospital_id: hospitalId,
                    appointment_date: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$appointment_date" },
                    appointments: { $sum: 1 }
                }
            }
        ]);

        const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        // Build full 7-day array (fill 0 for missing days)
        const weeklyMap = {};
        weeklyData.forEach(d => {
            weeklyMap[d._id - 1] = d.appointments;
        });
        const weeklyAppointments = daysMap.map((day, idx) => ({
            day,
            appointments: weeklyMap[idx] || 0
        }));

        // ── Doctor availability (real data) ──────────────────────────────────
        const doctors = await HospitalStaffModel.find({
            hospital_id: hospitalId,
            role: "DOCTOR"
        }).limit(6);

        const doctorAvailability = await Promise.all(
            doctors.map(async (doc) => {
                const hasSlotToday = await AppointmentSlotsModel.findOne({
                    doctor_id: doc._id,
                    hospital_id: hospitalId,
                    appointment_date: { $gte: today, $lt: tomorrow },
                    slot_status: "AVAILABLE"
                });
                return {
                    name: doc.name,
                    specialization: doc.specialization || "",
                    available: !!hasSlotToday
                };
            })
        );

        // ── Recent appointments as activity feed ─────────────────────────────
        const recentAppts = await AppointmentModel.find({ hospital_id: hospitalId })
            .populate("patient_id", "patient_name")
            .populate("doctor_id", "name")
            .sort({ createdAt: -1 })
            .limit(6);

        const activities = recentAppts.map(a => ({
            text: `${a.patient_id?.patient_name || "Patient"} booked with ${a.doctor_id?.name || "Doctor"}`,
            status: a.appointment_status,
            time: a.start_time,
            date: a.appointment_date
        }));

        // ── Notifications ────────────────────────────────────────────────────
        const notifications = [];
        if (totalPendingAppointments > 0) notifications.push({ msg: `${totalPendingAppointments} Pending Appointments`, color: "amber" });
        if (totalRescheduleRequests > 0) notifications.push({ msg: `${totalRescheduleRequests} Reschedule Requests`, color: "blue" });
        if (totalDoctors === 0) notifications.push({ msg: "No doctors registered yet", color: "red" });
        if (totalAvailableSlots === 0) notifications.push({ msg: "No available slots — add appointment slots", color: "red" });

        res.json({
            message: "Dashboard data fetched successfully",
            stats: {
                totalDoctors,
                totalAppointments,
                totalPendingAppointments,
                totalScheduledAppointments,
                totalCompletedAppointments,
                totalCancelledAppointments,
                totalRescheduleRequests,
                totalAppointmentSlots,
                totalAvailableSlots,
            },
            todayAppointments,
            weeklyAppointments,
            doctorAvailability,
            notifications,
            activities
        });

    } catch (error) {
        console.log("Dashboard Stats Error:", error);
        res.status(500).json({ message: "Error fetching dashboard stats", error: error.message });
    }
};


exports.getHospitalFeedbacks = async (req, res) => {
    try {
        console.log("Hospital ID:", req.hospitalId);

        if (!req.hospitalId) {
            return res.status(400).json({ message: "Hospital ID missing" });
        }

        const feedbacks = await FeedbackModel.find({ hospital_id: req.hospitalId })
            .populate("patient_id", "patient_name patient_email patient_phone")
            .populate("doctor_id", "name specialization img")
            .populate("appointment_id", "appointment_date start_time end_time")
            .sort({ feedback_date: -1 })
            .lean();

        const totalRatings = feedbacks.reduce((s, f) => s + (f.rating || 0), 0);

        const avgRating = feedbacks.length
            ? (totalRatings / feedbacks.length).toFixed(1)
            : 0;

        const ratingCounts = [1, 2, 3, 4, 5].map(r => ({
            rating: r,
            count: feedbacks.filter(f => f.rating === r).length
        }));

        res.status(200).json({
            message: "Feedbacks fetched",
            total: feedbacks.length,
            avgRating: Number(avgRating),
            ratingCounts,
            feedbacks
        });

    } catch (error) {
        console.error("ERROR:", error); // VERY IMPORTANT
        res.status(500).json({
            message: "Error fetching feedbacks",
            error: error.message
        });
    }
};



// ── HOSPITAL FORGOT PASSWORD ──────────────────────────────────────────────────
exports.hospitalForgotPassword = async (req, res) => {
    try {
        const { hospital_email } = req.body;

        if (!hospital_email)
            return res.status(400).json({ message: "Email is required" });

        const hospital = await HospitalModel.findOne({ hospital_email: hospital_email.toLowerCase().trim() });

        if (!hospital)
            return res.status(404).json({ message: "No hospital account found with this email" });

        const resetToken = jwt.sign(
            { id: hospital._id, purpose: "hospital_password_reset" },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const resetUrl = `${process.env.FRONTEND_URL}/hospital-reset-password/${resetToken}`;

        // ── Print to console only ─────────────────────────────────────────────
        console.log("===================================");
        console.log("🏥 HOSPITAL PASSWORD RESET LINK:");
        console.log(resetUrl);
        console.log("===================================");

        res.status(200).json({
            message: "Reset link sent to your email",
            resetToken,
            hospital_name: hospital.hospital_name
        });

    } catch (error) {
        console.error("hospitalForgotPassword error:", error);
        res.status(500).json({ message: "Error generating reset token", error: error.message });
    }
};


// ── HOSPITAL VERIFY RESET TOKEN ───────────────────────────────────────────────
exports.hospitalVerifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError")
                return res.status(400).json({ valid: false, message: "Link has expired. Please request a new one." });
            return res.status(400).json({ valid: false, message: "Invalid reset link." });
        }

        if (decoded.purpose !== "hospital_password_reset")
            return res.status(400).json({ valid: false, message: "Invalid token." });

        const hospital = await HospitalModel.findById(decoded.id).select("hospital_name hospital_email");
        if (!hospital)
            return res.status(404).json({ valid: false, message: "Hospital not found." });

        res.status(200).json({ valid: true, hospital_name: hospital.hospital_name });

    } catch (error) {
        res.status(500).json({ valid: false, message: "Server error" });
    }
};


// ── HOSPITAL RESET PASSWORD ───────────────────────────────────────────────────
exports.hospitalResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { new_password, confirm_password } = req.body;

        if (!new_password || !confirm_password)
            return res.status(400).json({ message: "Both fields are required" });

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

        if (decoded.purpose !== "hospital_password_reset")
            return res.status(400).json({ message: "Invalid token purpose" });

        const hospital = await HospitalModel.findById(decoded.id);
        if (!hospital)
            return res.status(404).json({ message: "Hospital not found" });

        hospital.hospital_pass = await bcrypt.hash(new_password, 12);
        await hospital.save();

        res.status(200).json({ message: "Password reset successfully. You can now log in." });

    } catch (error) {
        console.error("hospitalResetPassword error:", error);
        res.status(500).json({ message: "Error resetting password", error: error.message });
    }
};




exports.exportAppointmentsExcel = async (req, res) => {

    try {

        const hospitalId = req.hospitalId;

        const appointments = await AppointmentModel.find({
            hospital_id: hospitalId
        })
        .populate("patient_id")
        .populate("doctor_id");

        const workbook = await generateAppointmentExcel(appointments);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=AppointmentsReport.xlsx"
        );

        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {

        res.status(500).json({
            message: "Error exporting report",
            error: error.message
        });

    }
};