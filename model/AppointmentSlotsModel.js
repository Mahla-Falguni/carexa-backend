const mongoose = require("mongoose");

const AppointmentSlotSchema = new mongoose.Schema({

    appointment_date: {
        type: Date,
        required: true
    },

    start_time: {
        type: String,
        required: true
    },

    end_time: {
        type: String,
        required: true
    },

    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalstaff_msts",
        required: true
    },

    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospital_mst",
        required: true
    },
    slot_status: {
        type: String,
        enum: ["AVAILABLE", "BOOKED", "CANCELLED", "COMPLETED"],
        default: "AVAILABLE"
    },
    slot_duration: {
        type: Number,
        default: 30
    },
    booked_by:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_mst",
        default: null
    },
    reschedule_request:
    {
        type: Boolean,
        default: false
    },
    reschedule_request_by:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_mst",
        default: null
    },
    reschedule_request_at:
    {
        type: Date,
        default: null
    },
    reschedule_status:
    {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
    }

}, { timestamps: true });

AppointmentSlotSchema.index(
  { doctor_id: 1, appointment_date: 1, start_time: 1 },
  { unique: true }
);

module.exports = mongoose.model("appointment_slot_mst", AppointmentSlotSchema);