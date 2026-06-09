const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema({
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

    patient_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_mst',
        required: true
    },

    doctor_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'hospitalstaff_msts',
        required: true
    },

    hospital_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'hospital_mst',
        required: true
    },

    appointment_status: { 
        type: String,
        enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'PENDING'],
        default: 'PENDING'
    }

}, { timestamps: true });

module.exports = mongoose.model("appointment_msts", AppointmentSchema);