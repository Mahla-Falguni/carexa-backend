const express = require('express');
const router = express.Router();

const { createPlan, getAllPlans, updatePlan, getPlanDetails, deletePlan } = require('../controller/Plan/PlanController');
const { getAllSubscriptions, togglePlanStatus, getPlanStats, getHospitalsByPlan } = require('../controller/Plan/HospitalPlanController');
const adminAuth = require('../middleware/adminAuth');

// http://localhost:5000/planapi/create-plan
router.post('/create-plan', adminAuth, createPlan);

// http://localhost:5000/planapi/get-all-plans
router.get('/get-all-plans', getAllPlans);

// http://localhost:5000/planapi/update-plan/:planId
router.post('/update-plan/:planId', adminAuth, updatePlan);

// http://localhost:5000/planapi/delete-plan/:planId
router.delete('/delete-plan/:planId', adminAuth, deletePlan);

// http://localhost:5000/planapi/get-plan-details
router.get('/get-plan-details', adminAuth, getPlanDetails);

// http://localhost:5000/planapi/all-subscriptions
router.get("/all-subscriptions", adminAuth, getAllSubscriptions);

// http://localhost:5000/planapi/toggle-status/:planId
router.put("/toggle-status/:planId", adminAuth, togglePlanStatus);

// http://localhost:5000/planapi/plan-stats
router.get("/plan-stats", adminAuth, getPlanStats);

// http://localhost:5000/planapi/hospitals-by-plan/:planId
router.get("/hospitals-by-plan/:planId", adminAuth, getHospitalsByPlan);

module.exports = router;