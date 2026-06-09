require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const users = require('../../model/UserModel');
const HospitalModel = require('../../model/HospitalModel');
const HospitalStaffModel = require('../../model/HospitalStaffModel');
const AppointmentSlot = require('../../model/AppointmentSlotsModel');
const AppointmentModel = require('../../model/AppointmentModel');
const RescheduleRequestModel = require('../../model/RescheduleRequestModel');
const AppointmentSlotsModel = require('../../model/AppointmentSlotsModel');
const HospitalSubscription = require("../../model/HospitalSubscriptionModel");
const FeedbackModel = require('../../model/FeedbackModel');



// ── REGISTER ─────────────────────────────────────────
exports.registerUser = async (req, res) => {
  try {
    const { patient_name, patient_pass, patient_email, patient_phone,
      patient_gender, patient_dob, patient_address, patient_status } = req.body;

    if (!patient_name || !patient_pass || !patient_email)
      return res.status(400).json({ Message: "All fields are required" });

    const existingUser = await users.findOne({ patient_email });
    if (existingUser)
      return res.status(409).json({ Message: "User already exists with this email" });

    const hashedPassword = await bcrypt.hash(patient_pass, 12);
    const newUser = new users({
      patient_name, patient_pass: hashedPassword, patient_email,
      patient_phone, patient_gender, patient_dob, patient_address, patient_status
    });
    await newUser.save();

    res.status(201).json({ Message: "User registered successfully", Name: patient_name });
  } catch (error) {
    res.status(500).json({ Message: "Registration failed", error: error.message });
  }
};


// ── LOGIN ─────────────────────────────────────────────
exports.loginUser = async (req, res) => {
  try {
    const { patient_email, patient_pass } = req.body;
    if (!patient_email || !patient_pass)
      return res.status(400).json({ Message: "Email and Password are required" });

    const user = await users.findOne({ patient_email });
    if (!user) return res.status(401).json({ Message: "Email is incorrect" });

    const isMatch = await bcrypt.compare(patient_pass, user.patient_pass);
    if (!isMatch) return res.status(401).json({ Message: "Password is incorrect" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "6h" });

    res.status(200).json({
      Message: "Login successful",
      Name: user.patient_name,
      Email: user.patient_email,
      Phone: user.patient_phone,
      Token: token
    });
  } catch (error) {
    res.status(500).json({ Message: "Login failed", error: error.message });
  }
};


// ── GET PROFILE ──────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const user = await users.findById(req.userId).select("-patient_pass");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
};


// ── UPDATE PROFILE ───────────────────────────────────
exports.updateUserProfile = async (req, res) => {
  try {
    const { patient_name, patient_phone, patient_dob, patient_gender, patient_address } = req.body;
    const updateData = { patient_name, patient_phone, patient_dob, patient_gender, patient_address };
    if (req.file) updateData.patient_img = req.file.filename;

    const updated = await users.findByIdAndUpdate(
      req.userId, { $set: updateData }, { new: true }
    ).select("-patient_pass");

    res.status(200).json({ message: "Profile updated successfully", user: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};


// ── CHANGE PASSWORD ──────────────────────────────────
exports.changeUserPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(current_password, user.patient_pass);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.patient_pass = await bcrypt.hash(new_password, 10);
    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password", error: error.message });
  }
};


// ── HELPER: Check if hospital has active subscription ──────────────────────
const hasActiveSubscription = async (hospitalId) => {
  try {
    const subscription = await HospitalSubscription.findOne({
      hospital_id: new mongoose.Types.ObjectId(String(hospitalId)),
      status: "ACTIVE"
    });
    return !!subscription;
  } catch (err) {
    console.error("[Subscription Check Error]", err.message);
    return false;
  }
};


// ── GET ALL HOSPITALS (only with active subscriptions) ─────────────────────
exports.getHospitals = async (req, res) => {
  try {
    // Step 1: Get all ACTIVE subscriptions
    const activeSubscriptions = await HospitalSubscription.find({
      status: "ACTIVE"
    }).select("hospital_id").lean();

    if (activeSubscriptions.length === 0) {
      return res.status(200).json({
        message: "No hospitals with active subscriptions",
        total: 0,
        hospitals: []
      });
    }


    const activeHospitalIds = [
      ...new Set(
        activeSubscriptions
          .map(s => s.hospital_id?.toString())
          .filter(Boolean)
      )
    ].map(id => new mongoose.Types.ObjectId(id));


    const hospitals = await HospitalModel.find({
      _id: { $in: activeHospitalIds }
    }).select("-hospital_pass");

    res.status(200).json({
      message: "Hospitals fetched successfully",
      total: hospitals.length,
      hospitals
    });

  } catch (error) {
    console.error("[getHospitals] Error:", error.message);
    res.status(500).json({ message: "Error fetching hospitals", error: error.message });
  }
};


// ── GET SINGLE HOSPITAL DETAILS ──────────────────────
exports.getHospitalDetails = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    if (!(await hasActiveSubscription(hospitalId))) {
      return res.status(403).json({
        message: "This hospital's subscription has expired. Booking is unavailable."
      });
    }

    const hospital = await HospitalModel.findById(hospitalId).select("-hospital_pass");
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    res.status(200).json({ hospital });
  } catch (error) {
    res.status(500).json({ message: "Error fetching hospital details", error: error.message });
  }
};


// ── GET DOCTORS BY HOSPITAL ──────────────────────────
exports.getDoctorsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;

    console.log(`\n[getDoctorsByHospital] Called with hospitalId: ${hospitalId}`);

    if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
      console.log(`[getDoctorsByHospital] ❌ Invalid hospitalId`);
      return res.status(400).json({ message: "Invalid Hospital ID" });
    }

    // ── Check subscription ────────────────────────────────────────────────
    const subscription = await HospitalSubscription.findOne({
      hospital_id: new mongoose.Types.ObjectId(hospitalId),
      status: "ACTIVE"
    });
    console.log(`[getDoctorsByHospital] Subscription found:`, subscription ? `YES (status: ${subscription.status})` : "NO");

    if (!subscription) {
      return res.status(403).json({
        message: "This hospital's subscription has expired."
      });
    }

    // ── Find ALL staff for this hospital first (for debug) ────────────────
    const allStaff = await HospitalStaffModel.find({
      hospital_id: new mongoose.Types.ObjectId(hospitalId)
    });
    console.log(`[getDoctorsByHospital] Total staff in hospital: ${allStaff.length}`);
    console.log(`[getDoctorsByHospital] Staff roles found:`, allStaff.map(s => s.role));

    // ── Now find only doctors (handle any role casing) ────────────────────
    const doctors = await HospitalStaffModel.find({
      hospital_id: new mongoose.Types.ObjectId(hospitalId),
      role: { $in: ["DOCTOR", "Doctor", "doctor"] }
    }).populate('hospital_id', 'hospital_name hospital_address');

    console.log(`[getDoctorsByHospital] Doctors found: ${doctors.length}`);

    return res.status(200).json({
      message: "Doctors fetched successfully",
      total: doctors.length,
      doctors
    });

  } catch (error) {
    console.error("[getDoctorsByHospital] ERROR:", error.message);
    return res.status(500).json({ message: "Error fetching doctors", error: error.message });
  }
};


// ── GET DOCTOR SLOTS FOR USER ────────────────────────
exports.getDoctorSlotsForUser = async (req, res) => {
  try {
    const { hospitalId, doctorId } = req.params;

    if (!(await hasActiveSubscription(hospitalId))) {
      return res.status(403).json({
        message: "This hospital's subscription has expired. Slots are unavailable."
      });
    }

    // ── Get today's date at midnight (start of today) ──────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = await AppointmentSlot.find({
      hospital_id: hospitalId,
      doctor_id: doctorId,
      slot_status: "AVAILABLE",
      appointment_date: { $gte: today }   // ← only today and future dates
    }).sort({ appointment_date: 1, start_time: 1 });

    if (!slots || slots.length === 0)
      return res.status(404).json({ message: "No available slots found for this doctor" });

    res.status(200).json({
      message: "Available slots fetched successfully",
      total: slots.length,
      slots
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointment slots", error: error.message });
  }
};


// ── BOOK APPOINTMENT ─────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { slotId } = req.body;

    if (!slotId) return res.status(400).json({ message: "Slot ID is required" });

    const slot = await AppointmentSlotsModel.findById(slotId);
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    if (!(await hasActiveSubscription(slot.hospital_id))) {
      return res.status(403).json({
        message: "This hospital's subscription has expired. Booking is unavailable."
      });
    }

    if (slot.slot_status !== "AVAILABLE") {
      return res.status(400).json({
        message: "This slot has already been booked. Please choose a different time slot."
      });
    }

    const userAlreadyBooked = await AppointmentModel.findOne({
      patient_id: userId,
      doctor_id: slot.doctor_id,
      hospital_id: slot.hospital_id,
      appointment_date: slot.appointment_date,
      start_time: slot.start_time,
      appointment_status: { $in: ["SCHEDULED", "PENDING"] }
    });

    if (userAlreadyBooked)
      return res.status(400).json({ message: "You have already booked this appointment slot." });

    const currentDateTime = new Date();
    const slotDateTime = new Date(slot.appointment_date);
    const timeParts = slot.start_time.split(" ");
    let [hours, minutes] = timeParts[0].split(":");
    const modifier = timeParts[1];
    hours = parseInt(hours);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    slotDateTime.setHours(hours);
    slotDateTime.setMinutes(parseInt(minutes));

    if (slotDateTime < currentDateTime)
      return res.status(400).json({ message: "Cannot book past slots" });

    const updatedSlot = await AppointmentSlotsModel.findOneAndUpdate(
      { _id: slotId, slot_status: "AVAILABLE" },
      { $set: { slot_status: "BOOKED", booked_by: userId } },
      { new: true }
    ).populate("booked_by", "patient_name patient_email patient_phone");

    if (!updatedSlot)
      return res.status(400).json({
        message: "This slot has already been booked by another user. Please choose a different time slot."
      });

    const appointment = await AppointmentModel.create({
      appointment_date: updatedSlot.appointment_date,
      start_time: updatedSlot.start_time,
      end_time: updatedSlot.end_time,
      patient_id: userId,
      doctor_id: updatedSlot.doctor_id,
      hospital_id: updatedSlot.hospital_id,
      appointment_status: "SCHEDULED"
    });

    const populatedAppointment = await AppointmentModel.findById(appointment._id)
      .populate("patient_id", "patient_name patient_email patient_phone")
      .populate("doctor_id", "name specialization phone")
      .populate("hospital_id", "hospital_name hospital_address hospital_phone");

    res.status(201).json({
      message: "Appointment booked successfully",
      slot: updatedSlot,
      appointment: populatedAppointment
    });

  } catch (error) {
    console.log("Booking Error:", error);
    res.status(500).json({ message: "Error booking appointment", error: error.message });
  }
};


// ── GET MY APPOINTMENTS ──────────────────────────────
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await AppointmentModel.find({ patient_id: req.userId })
      .populate("doctor_id")
      .populate("hospital_id")
      .sort({ appointment_date: -1 });

    res.status(200).json({ appointments });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// ── REQUEST RESCHEDULE ───────────────────────────────
exports.requestReschedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointmentId, preferredDate, preferredStartTime, preferredEndTime } = req.body;

    if (!appointmentId)
      return res.status(400).json({ message: "appointmentId is required" });

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      patient_id: userId,
      appointment_status: { $in: ["SCHEDULED", "PENDING"] }
    });

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found or already completed/cancelled" });

    const existing = await RescheduleRequestModel.findOne({
      appointment_id: appointment._id,
      status: "PENDING"
    });

    if (existing)
      return res.status(400).json({ message: "A reschedule request is already pending for this appointment" });

    const reason = preferredDate && preferredStartTime
      ? `Patient requested reschedule to ${preferredDate} at ${preferredStartTime} – ${preferredEndTime || ""}`
      : "Patient requested reschedule";

    await RescheduleRequestModel.create({
      appointment_id: appointment._id,
      requested_by: userId,
      reason,
      status: "PENDING"
    });

    res.status(200).json({ message: "Reschedule request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending reschedule request", error: error.message });
  }
};


// ── GET MY RESCHEDULE REQUESTS ───────────────────────
exports.getMyRescheduleRequests = async (req, res) => {
  try {
    const requests = await RescheduleRequestModel.find({
      requested_by: req.userId
    }).populate("appointment_id");

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Error fetching reschedule requests", error: error.message });
  }
};


// ── CANCEL APPOINTMENT ───────────────────────────────
exports.cancelAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.body;

    if (!appointmentId)
      return res.status(400).json({ message: "appointmentId is required" });

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      patient_id: userId,
      appointment_status: { $in: ["SCHEDULED", "PENDING"] }
    });

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found or already cancelled/completed" });

    appointment.appointment_status = "CANCELLED";
    await appointment.save();

    await AppointmentSlotsModel.findOneAndUpdate(
      {
        doctor_id: appointment.doctor_id,
        hospital_id: appointment.hospital_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        booked_by: userId
      },
      { $set: { slot_status: "AVAILABLE", booked_by: null } }
    );

    res.status(200).json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling appointment", error: error.message });
  }
};


// ── GET AVAILABLE SLOTS ──────────────────────────────
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, hospitalId, date } = req.query;

    if (!doctorId || !date)
      return res.status(400).json({ message: "doctorId and date are required" });

    if (hospitalId && !(await hasActiveSubscription(hospitalId))) {
      return res.status(403).json({
        message: "This hospital's subscription has expired. Slots are unavailable."
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      doctor_id: doctorId,
      appointment_date: { $gte: startOfDay, $lte: endOfDay },
      slot_status: "AVAILABLE"
    };

    if (hospitalId) query.hospital_id = hospitalId;

    const slots = await AppointmentSlotsModel.find(query)
      .sort({ start_time: 1 })
      .select("start_time end_time appointment_date slot_status _id");

    return res.status(200).json({ slots });
  } catch (error) {
    console.error("getAvailableSlots error:", error);
    return res.status(500).json({ message: "Error fetching available slots", error: error.message });
  }
};


exports.getMyCaseHistories = async (req, res) => {
  try {
    const PatientCaseHistoryModel = require('../../model/PatientCaseHistoryModel');

    const histories = await PatientCaseHistoryModel.find({
      patient_id: req.userId,
    })
      .populate('doctor_id', 'name specialization phone')
      .populate('hospital_id', 'hospital_name hospital_address hospital_phone')
      .populate('appointment_id', 'appointment_date start_time end_time')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Case histories fetched successfully',
      total: histories.length,
      histories,
    });
  } catch (error) {
    console.error('getMyCaseHistories error:', error);
    res.status(500).json({ message: 'Error fetching case histories', error: error.message });
  }
};



exports.getMyVisits = async (req, res) => {
  try {
    const PatientVisitModel = require('../../model/PatientVisitModel');

    const visits = await PatientVisitModel.find({
      patient_id: req.userId,
    })
      .populate('doctor_id', 'name specialization phone')
      .populate('hospital_id', 'hospital_name hospital_address')
      .sort({ visit_date: -1 });

    res.status(200).json({
      message: 'Visits fetched successfully',
      total: visits.length,
      visits,
    });
  } catch (error) {
    console.error('getMyVisits error:', error);
    res.status(500).json({ message: 'Error fetching visits', error: error.message });
  }
};




// ── POST /userapi/submit-feedback ────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointment_id, rating, feedback_text } = req.body;

    if (!appointment_id || !rating || !feedback_text)
      return res.status(400).json({ message: "appointment_id, rating and feedback_text are required" });

    if (rating < 1 || rating > 5)
      return res.status(400).json({ message: "Rating must be between 1 and 5" });

    // Verify appointment belongs to this user and is COMPLETED
    const appointment = await AppointmentModel.findOne({
      _id: appointment_id,
      patient_id: userId,
      appointment_status: "COMPLETED"
    });

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found or not yet completed" });

    // Prevent duplicate feedback
    const existing = await FeedbackModel.findOne({ appointment_id, patient_id: userId });
    if (existing)
      return res.status(400).json({ message: "You have already submitted feedback for this appointment" });

    const feedback = await FeedbackModel.create({
      appointment_id,
      patient_id: userId,
      doctor_id: appointment.doctor_id,
      hospital_id: appointment.hospital_id,
      feedback_text: feedback_text.trim(),
      rating,
      feedback_date: new Date()
    });

    const populated = await FeedbackModel.findById(feedback._id)
      .populate("appointment_id", "appointment_date start_time end_time")
      .populate("doctor_id", "name specialization")
      .populate("hospital_id", "hospital_name");

    res.status(201).json({ message: "Feedback submitted successfully", feedback: populated });

  } catch (error) {
    console.error("submitFeedback error:", error);
    res.status(500).json({ message: "Error submitting feedback", error: error.message });
  }
};


// ── GET /userapi/my-feedbacks ────────────────────────────────────────────────
exports.getMyFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackModel.find({ patient_id: req.userId })
      .populate("appointment_id", "appointment_date start_time end_time appointment_status")
      .populate("doctor_id", "name specialization img")
      .populate("hospital_id", "hospital_name hospital_address")
      .sort({ feedback_date: -1 });

    res.status(200).json({ message: "Feedbacks fetched", total: feedbacks.length, feedbacks });
  } catch (error) {
    res.status(500).json({ message: "Error fetching feedbacks", error: error.message });
  }
};


// ── GET /userapi/can-give-feedback/:appointmentId ────────────────────────────
exports.canGiveFeedback = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId;

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      patient_id: userId,
      appointment_status: "COMPLETED"
    });

    if (!appointment)
      return res.status(200).json({ canGive: false, reason: "Appointment not completed" });

    const existing = await FeedbackModel.findOne({ appointment_id: appointmentId, patient_id: userId });
    if (existing)
      return res.status(200).json({ canGive: false, reason: "Already submitted", feedback: existing });

    return res.status(200).json({ canGive: true });
  } catch (error) {
    res.status(500).json({ message: "Error checking feedback eligibility", error: error.message });
  }
};



// ──forgot-password ────────────────────────────────────────────
// ── NODEMAILER SETUP (add this near the top of UserController.js) ──────────
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



// ── FORGOT PASSWORD ────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { patient_email } = req.body;

    if (!patient_email)
      return res.status(400).json({ message: "Email is required" });

    const user = await users.findOne({ patient_email: patient_email.toLowerCase().trim() });

    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    if (user.patient_status === "INACTIVE")
      return res.status(403).json({ message: "Your account is inactive" });

    const resetToken = jwt.sign(
      { id: user._id, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // ── Print to console ──────────────────────────────────────────────────
    console.log("===================================");
    console.log("🔗 PASSWORD RESET LINK:");
    console.log(resetUrl);
    console.log("===================================");

    // ── Send email (non-blocking — won't crash if email fails) ───────────
    const mailOptions = {
      from: `"Carexa Support" <${process.env.EMAIL_USER}>`,
      to: user.patient_email,
      subject: "🔐 Carexa - Password Reset Link",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f0f4f8; border-radius: 16px;">
          <div style="background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(11,29,58,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 64px; height: 64px; background: #eff6ff; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">🔑</div>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; color: #0b1d3a; text-align: center; margin: 0 0 8px;">Password Reset Request</h2>
            <p style="font-size: 14px; color: #7a8fa6; text-align: center; margin: 0 0 28px; line-height: 1.6;">
              Hi <strong style="color: #0b1d3a;">${user.patient_name}</strong>! We received a request to reset your Carexa account password.
            </p>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1558b0 0%, #2f80ed 100%); color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600;">
                🔐 Reset My Password
              </a>
            </div>
            <p style="font-size: 13px; color: #7a8fa6; text-align: center; margin: 0 0 16px;">Or copy and paste this link into your browser:</p>
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font-size: 12px; font-family: monospace; color: #1558b0; word-break: break-all; margin-bottom: 24px;">
              ${resetUrl}
            </div>
            <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px;">
              <p style="font-size: 13px; color: #92400e; margin: 0;">
                ⏰ <strong>This link expires in 15 minutes.</strong> If you did not request this, ignore this email.
              </p>
            </div>
            <p style="font-size: 12px; color: #a0b0c8; text-align: center; margin: 0;">⚠️ Do not share this link with anyone.</p>
          </div>
          <p style="font-size: 11px; color: #a0b0c8; text-align: center; margin-top: 20px;">© ${new Date().getFullYear()} Carexa Healthcare. All rights reserved.</p>
        </div>
      `
    };

    // Try sending email but don't block the response if it fails
    transporter.sendMail(mailOptions)
      .then(() => console.log(`✅ Reset email sent to: ${user.patient_email}`))
      .catch(err => console.error(`❌ Email failed (token still valid): ${err.message}`));

    // Always return success — reset link is in console even if email fails
    res.status(200).json({
      message: "Reset link sent to your email",
      resetToken,
      patient_name: user.patient_name
    });

  } catch (error) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Error generating reset token", error: error.message });
  }
};


// ──reset-password/:token ──────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { new_password, confirm_password } = req.body;

    if (!token)
      return res.status(400).json({ message: "Reset token is required" });

    if (!new_password || !confirm_password)
      return res.status(400).json({ message: "new_password and confirm_password are required" });

    if (new_password !== confirm_password)
      return res.status(400).json({ message: "Passwords do not match" });

    if (new_password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError")
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      return res.status(400).json({ message: "Invalid reset token" });
    }

    // Extra safety: ensure this token was issued for password_reset only
    if (decoded.purpose !== "password_reset")
      return res.status(400).json({ message: "Invalid token purpose" });

    const user = await users.findById(decoded.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Update password
    user.patient_pass = await bcrypt.hash(new_password, 10);
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });

  } catch (error) {
    console.error("resetPassword error:", error);
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};


// ──verify-reset-token/:token ─────────────────────────────────
exports.verifyResetToken = async (req, res) => {
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

    if (decoded.purpose !== "password_reset")
      return res.status(400).json({ valid: false, message: "Invalid token." });

    const user = await users.findById(decoded.id).select("patient_name patient_email");
    if (!user)
      return res.status(404).json({ valid: false, message: "User not found." });

    res.status(200).json({ valid: true, patient_name: user.patient_name });

  } catch (error) {
    res.status(500).json({ valid: false, message: "Server error" });
  }
};


