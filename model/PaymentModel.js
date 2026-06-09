const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "appointment_msts",
        required: true
    },
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_mst",
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
    recorded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalstaff_msts"   // receptionist who recorded it
    },
    amount: {
        type: Number,
        required: true
    },
    payment_method: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "OTHER"],
        required: true
    },
    upi_id: {
        type: String,
        default: null    // filled if method is UPI
    },
    transaction_id: {
        type: String,
        default: null    // optional reference
    },
    notes: {
        type: String,
        default: ""
    },
    payment_status: {
        type: String,
        enum: ["PAID", "PENDING", "FAILED"],
        default: "PAID"
    },
    payment_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("payment_mst", PaymentSchema, "payment_msts");