const mongoose = require("mongoose")

const AdminSchema = new mongoose.Schema({
    admin_name: { 
        type: String, 
        required: true 
    },
    admin_email: { 
        type: String, 
        unique: true,
        required: true 
    },
    admin_pass: { 
        type: String,
        required: true 
    },
    admin_phone: {
        type: Number,
        required: true
    },
    Admin_status: { 
        type: String,
        enum: ['ACTIVE', 'INACTIVE']
    }
},{timestamps: true})

module.exports = mongoose.model("admin_mst", AdminSchema)