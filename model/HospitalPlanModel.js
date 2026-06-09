const mongoose = require("mongoose");

const HospitalPlanSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    }
}, { timestamps: true });

module.exports = mongoose.model("hospital_plan_msts", HospitalPlanSchema);