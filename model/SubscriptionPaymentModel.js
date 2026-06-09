const mongoose = require("mongoose");

const SubscriptionPaymentSchema = new mongoose.Schema({
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospital_mst"
    },
    plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "plans_mst"
    },
    amount: Number,
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    payment_status: {
        type: String,
        default: "COMPLETED"
    }
},{timestamps:true});

module.exports = mongoose.model("subscription_payment_mst", SubscriptionPaymentSchema);