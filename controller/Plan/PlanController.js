const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PlansModel = require('../../model/PlansModel');

//  ADMIN CREATES PLAN
exports.createPlan = async (req, res) => {
    try {
        const { plan_name, plan_duration, plan_price } = req.body;
        const adminId = req.adminId;  
        const newPlan = new PlansModel({
            plan_name,
            plan_duration,
            plan_price, 
            added_by:req.adminId
        });
        await newPlan.save();
        res.json({ message: "Plan created successfully", plan: newPlan });
    } catch (error) {
        res.json({ error: error.message });
    }
};


//  ADMIN GETS ALL PLANS
exports.getAllPlans = async (req, res) => {
    try {
        const plans = await PlansModel.find();
        res.json({ message: "Plans retrieved successfully", plans });
    } catch (error) {
        res.json({ error: error.message });
    }   
};

//  ADMIN UPDATES PLAN
exports.updatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const { plan_name, plan_duration, plan_price } = req.body;
        const updatedPlan = await PlansModel.findByIdAndUpdate(
            planId,
            { plan_name, plan_duration, plan_price },
            { returnDocument: after }
        );
        if (!updatedPlan) {
            return res.json({ error: "Plan not found" });
        }
        res.json({ message: "Plan updated successfully", plan: updatedPlan });
    } catch (error) {
        res.json({ error: error.message });
    }
};


// VIEW PLAN DETAILS

exports.getPlanDetails = async (req, res) => {
    try {        
        const plan = await PlansModel.find();
        if (!plan) {
            return res.json({ error: "Plan not found" });
        }
        res.json({ message: "Plan details retrieved successfully", plan });
    } catch (error) {
        res.json({ error: error.message });
    }
};


exports.deletePlan = async (req, res) => {
    await PlansModel.findByIdAndDelete(req.params.planId);
    res.json({ message: "Plan deleted successfully" });
};

