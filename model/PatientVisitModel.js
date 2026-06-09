const mongoose = require("mongoose")

const Patient_VisitSchema = new mongoose.Schema({
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
    },
    visit_date: {
        type: Date,
        default: Date.now
    },
    symptoms: { 
        type: String,
        required: true
    },
    diagnosis: {
        type: String,
        required: true
    },
    treatment: {
        type: String,
        required: true
    }
}, { timestamps: true })

module.exports = mongoose.model("patient_visit_mst", Patient_VisitSchema)