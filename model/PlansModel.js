const mongoose = require('mongoose');

const PlansSchema = new mongoose.Schema({
    plan_name: {
        type: String,
        required: true
    },
    plan_duration: {
        type: Number,
        required: true
    },
    plan_price: {
        type: Number,
        required: true
    },
    plan_status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },
    added_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin_mst',
        
    },
    added_date: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('plans_mst', PlansSchema);
