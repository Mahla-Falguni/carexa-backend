const mongoose = require("mongoose");

const HospitalSubscriptionSchema = new mongoose.Schema({
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospital_mst",
        required: true
    },
    plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "plans_mst",
        required: true
    },
    subscribed_date: {
        type: Date,
        default: Date.now
    },
    expiry_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
        default: "ACTIVE"
    }
}, { timestamps: true });


module.exports = mongoose.model( "hospital_subscription", HospitalSubscriptionSchema, "hospital_subscriptions" );