const HospitalSubscription = require("../model/HospitalSubscriptionModel");

// Use this on USER-facing routes to block expired hospitals
const checkHospitalSubscription = async (hospitalId) => {
    const subscription = await HospitalSubscription.findOne({
        hospital_id: hospitalId,
        status: "ACTIVE"
    });

    if (!subscription) return false;

    // Check if expired
    if (new Date() > new Date(subscription.expiry_date)) {
        // Auto-mark as EXPIRED
        await HospitalSubscription.findByIdAndUpdate(subscription._id, { status: "EXPIRED" });
        return false;
    }

    return true;
};

module.exports = checkHospitalSubscription;