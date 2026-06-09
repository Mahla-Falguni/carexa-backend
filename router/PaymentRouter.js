const express = require("express");
const router = express.Router();
const hospitalAuth = require("../middleware/hospitalAuth");

const {
    createOrder,
    verifyPayment,
} = require("../controller/Payment/PaymentController")




// http://localhost:5000/api/create-order
router.post("/create-order",hospitalAuth, createOrder);

// http://localhost:5000/api/verify-payment
router.post("/verify-payment",hospitalAuth, verifyPayment);

module.exports = router;