const express = require('express');
const router = express.Router();

const { createHospitalRequest, loginHospital } = require('../controller/Guest/GuestController');
const upload = require('../middleware/upload');

// http://localhost:5000/guestapi/hospital-request
router.post('/hospital-request', upload.single('hospital_img'),  createHospitalRequest);

// http://localhost:5000/guestapi/loginHospital
router.post('/loginHospital', loginHospital )

module.exports = router;