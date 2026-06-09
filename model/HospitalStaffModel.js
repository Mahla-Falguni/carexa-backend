const mongoose = require("mongoose")

const HospitalStaffSchema = new mongoose.Schema({
    hospital_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'hospital_mst',
    },
    name: { 
        type: String,
        required: true
    },
    email: { 
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        default: null
    },
    phone: { 
        type: String,
        required: true
    },
    specialization: { 
        type: String,
        required: true
    },
    experience_years: { 
        type: Number,
    },
    consultation_fee: { 
        type: Number,
        required: true
    },
    role: {
        type: String,
        enum: ['DOCTOR', 'EMPLOYEE', 'NURSE', 'STAFF', 'RECEPTIONIST', 'OTHER'],
        required: true
    },
    img: { 
        type: String,
    },
    status: { 
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
        default: 'ACTIVE'
    }
}, { timestamps: true })

module.exports = mongoose.model("hospitalstaff_msts", HospitalStaffSchema)