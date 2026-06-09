const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
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
    feedback_text: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    feedback_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("feedback_mst", FeedbackSchema, "feedback_msts");