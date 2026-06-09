const mongoose = require("mongoose")

const HospitalSchema = new mongoose.Schema({
    hospital_name: {
        type: String,
        required: true
    },
    hospital_email: {
        type: String,
        unique: true,
        required: true
    },
    hospital_pass: {
        type: String,
        required: true
    },
    hospital_address: {
        type: String,
        required: true
    },
    hospital_phone: {
        type: String,

    },
    hospital_img: {
        type: String,
    },
    hospital_license: {
        type: String,

    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin_mst',

    },
    hospital_status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    }
}, { timestamps: true })

module.exports = mongoose.model("hospital_mst", HospitalSchema) 