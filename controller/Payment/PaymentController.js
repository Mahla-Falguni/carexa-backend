const Razorpay = require("razorpay");
const crypto = require("crypto");

const SubscriptionPayment = require("../../model/SubscriptionPaymentModel");
const HospitalSubscription = require("../../model/HospitalSubscriptionModel");
const Plans = require("../../model/PlansModel");
const HospitalPlan = require("../../model/HospitalPlanModel");
const PaymentModel   = require('../../model/PaymentModel');
const AppointmentModel = require('../../model/AppointmentModel');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: "receipt_plan_" + Date.now(),
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        res.json(order);

    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
};

// Verify Payment & Activate Subscription
exports.verifyPayment = async (req, res) => {
    try {
        const hospital_id = req.hospitalId; // ✅ from auth middleware

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan_id,
            amount
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {

            // Save Payment History
            await SubscriptionPayment.create({
                hospital_id,
                plan_id,
                amount,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                payment_status: "COMPLETED"
            });

            // Get Plan
            const plan = await Plans.findById(plan_id);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Plan not found"
                });
            }

            // Calculate Expiry Date
            let expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + (plan.plan_duration * 30));

            // Activate Subscription
            // Activate Subscription
            await HospitalSubscription.findOneAndUpdate(
                { hospital_id },
                {
                    hospital_id,
                    plan_id,
                    subscribed_date: new Date(),
                    expiry_date: expiryDate,
                    status: "ACTIVE"
                },
                { upsert: true, returnDocument: "after" }
            );

            // ← ADD THIS: Also save to HospitalPlan
            await HospitalPlan.findOneAndUpdate(
                { hospital_id },
                {
                    hospital_id,
                    plan_id,
                    subscribed_date: new Date(),
                    status: "ACTIVE"
                },
                { upsert: true, returnDocument: "after" }
            );

            res.json({
                success: true,
                message: "Payment Verified & Subscription Activated"
            });

        } else {
            res.status(400).json({
                success: false,
                message: "Invalid Signature"
            });
        }

    } catch (error) {
        console.log("VERIFY ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};




exports.getHospitalAdminPayments = async (req, res) => {
    try {
        const hospitalId = req.hospitalId; 

        const payments = await PaymentModel.find({ hospital_id: hospitalId })
            .populate('appointment_id', 'appointment_date start_time end_time appointment_status')
            .populate('patient_id',     'patient_name patient_email patient_phone patient_gender')
            .populate('doctor_id',      'name specialization consultation_fee phone email img')
            .populate('hospital_id',    'hospital_name hospital_address hospital_phone')
            .populate('recorded_by',    'name role email')
            .sort({ payment_date: -1 });

        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenue = payments
            .filter(p => new Date(p.payment_date) >= today)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        res.status(200).json({
            message: 'Payments fetched successfully',
            total: payments.length,
            totalRevenue,
            todayRevenue,
            payments
        });
    } catch (error) {
        console.error('getHospitalAdminPayments error:', error);
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
};



exports.getDoctorPayments = async (req, res) => {
    try {
        const doctorId   = req.staffId;         
        const hospitalId = req.staffHospitalId; 

        // Guard: only DOCTOR role allowed
        if (req.staffRole !== 'DOCTOR') {
            return res.status(403).json({ message: 'Access denied. Doctors only.' });
        }

        const payments = await PaymentModel.find({
            doctor_id:   doctorId,
            hospital_id: hospitalId
        })
            .populate('appointment_id', 'appointment_date start_time end_time appointment_status')
            .populate('patient_id',     'patient_name patient_email patient_phone patient_gender patient_dob')
            .populate('doctor_id',      'name specialization consultation_fee')
            .populate('hospital_id',    'hospital_name hospital_address hospital_phone')
            .populate('recorded_by',    'name role')
            .sort({ payment_date: -1 });

        const totalEarnings = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEarnings = payments
            .filter(p => new Date(p.payment_date) >= today)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        res.status(200).json({
            message: 'Payments fetched successfully',
            total: payments.length,
            totalEarnings,
            todayEarnings,
            payments
        });
    } catch (error) {
        console.error('getDoctorPayments error:', error);
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
};