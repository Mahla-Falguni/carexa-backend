const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    patient_name: { 
        type: String, 
        required: true,
        trim: true 
    },
    patient_pass: { 
        type: String, 
        required: true 
    },
    patient_email: { 
        type: String, 
        unique: true,
        required: true,
        lowercase: true
    },
    patient_phone: { 
        type: String,
        
    },
    patient_gender: {
        type:String
    },
    patient_dob: {
        type: String
    },
    patient_address: {
        type: String
    },
    patient_img: { 
        type: String 
    },
    patient_status: { 
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    }
},{timestamps: true})

module.exports = mongoose.model("user_mst", UserSchema)