const HospitalPlanModel = require("../../model/HospitalPlanModel");
const PlansModel        = require("../../model/PlansModel");

// GET hospitals that selected a specific plan
exports.getHospitalsByPlan = async (req, res) => {
    try {
        const { planId } = req.params;

        const subscriptions = await HospitalPlanModel.find({ plan_id: planId })
            .populate("hospital_id", "hospital_name hospital_email hospital_address hospital_phone hospital_img")
            .populate("plan_id", "plan_name plan_price plan_duration")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Hospitals fetched successfully",
            total: subscriptions.length,
            subscriptions
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching hospitals", error: error.message });
    }
};

// GET all subscriptions (admin view)
exports.getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await HospitalPlanModel.find()
            .populate("hospital_id", "hospital_name hospital_email hospital_address hospital_img")
            .populate("plan_id",    "plan_name plan_price plan_duration")
            .sort({ createdAt: -1 });

        res.status(200).json({ message: "Subscriptions fetched", subscriptions });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};

// TOGGLE plan status ACTIVE / INACTIVE
exports.togglePlanStatus = async (req, res) => {
    try {
        const { planId } = req.params;

        const plan = await PlansModel.findById(planId);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        plan.plan_status = plan.plan_status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        await plan.save();

        res.status(200).json({ message: "Plan status updated", plan });
    } catch (error) {
        res.status(500).json({ message: "Error toggling status", error: error.message });
    }
};

// GET plan stats count
exports.getPlanStats = async (req, res) => {
    try {
        const plans = await PlansModel.find();

        const stats = await Promise.all(plans.map(async (plan) => {
            const count = await HospitalPlanModel.countDocuments({ plan_id: plan._id, status: "ACTIVE" });
            return {
                plan_id:   plan._id,
                plan_name: plan.plan_name,
                hospital_count: count
            };
        }));

        res.status(200).json({ stats });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
};