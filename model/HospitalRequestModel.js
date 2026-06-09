const mongoose = require('mongoose');

const HospitalRequestSchema = new mongoose.Schema({
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
    request_date: {
        type: Date,
        default: Date.now
    },
    request_status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },

});

module.exports = mongoose.model('hospital_request_mst', HospitalRequestSchema);