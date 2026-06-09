const mongoose = require("mongoose");

const RescheduleRequestSchema = new mongoose.Schema({

    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'appointment_msts',
        required: true
    },

    reason: {
        type: String,
    },

    preferred_date: {
        type: String,      
        default: null
    },

    preferred_start_time: {
        type: String,      
        default: null
    },

    preferred_end_time: {
        type: String,       
        default: null
    },

    requested_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_mst'
    },

    oldSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'appointment_slots'
    },

    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    }

}, { timestamps: true });

module.exports = mongoose.model("reschedulerequest_msts", RescheduleRequestSchema);