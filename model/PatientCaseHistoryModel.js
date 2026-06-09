const mongoose = require("mongoose")

const Patient_Case_HistorySchema = new mongoose.Schema({
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
    appointment_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'appointment_msts',
        required: false   
    },
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user_mst',  
        required: true
    },
    diagnosis: { 
        type: String,
        required: true
    },
    medications: { 
        type: String,
    },
    notes: { 
        type: String,
    },
    case_history_date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

module.exports = mongoose.model("patient_case_history_mst", Patient_Case_HistorySchema)