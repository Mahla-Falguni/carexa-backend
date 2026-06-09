require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const HospitalRequestModel = require('../../model/HospitalRequestModel');
const HospitalModel = require('../../model/HospitalModel');


//  GUEST CREATES HOSPITAL REQUEST
exports.createHospitalRequest = async (req, res) => {
    try {
        const {
            hospital_name,
            hospital_email,
            hospital_pass,
            hospital_address,
            hospital_phone,
            hospital_img
        } = req.body;

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(hospital_pass, 12);

        // Create new hospital request
        const newHospitalRequest = new HospitalRequestModel({
            hospital_name,
            hospital_email,
            hospital_pass: hashedPassword,
            hospital_address,
            hospital_phone,
            hospital_img
        });

        // Save the new request to the database
        const savedHospitalRequest = await newHospitalRequest.save();

        res.json({
            message: "Hospital request send successfully",
            data: savedHospitalRequest
        });
    } catch (error) {

        console.error("Error creating hospital request:", error);
        res.json({
            message: "Internal server error"
        });
    }
};


exports.getHospitalRequests = async (req, res) => {
    try {
        const hospitalRequests = await HospitalRequestModel.find();
        res.json({
            message: "Hospital requests retrieved successfully",
            data: hospitalRequests
        });
    } catch (error) {
        console.error("Error retrieving hospital requests:", error);
        res.json({
            message: "Internal server error"
        });
    }
};

exports.updateHospitalRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { request_status } = req.body;
        const updatedRequest = await HospitalRequestModel.findByIdAndUpdate(
            id,
            { request_status },
            { returnDocument: "after" }
        );
        if (!updatedRequest) {
            return res.status(404).json({ message: "Hospital request not found" });
        }
        res.status(200).json({
            message: "Hospital request status updated successfully",
            data: updatedRequest
        });
    } catch (error) {
        console.error("Error updating hospital request status:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

exports.approveHospitalRequest = async (req, res) => {
    try {

        const { request_status } = req.body;

        const request = await HospitalRequestModel.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        request.request_status = request_status;
        await request.save();

        if (request_status === "APPROVED") {

            const existingHospital = await HospitalModel.findOne({
                hospital_email: request.hospital_email
            });

            if (!existingHospital) {

                const hospital = new HospitalModel({
                    hospital_name: request.hospital_name,
                    hospital_email: request.hospital_email,
                    hospital_pass: request.hospital_pass,
                    hospital_phone: request.hospital_phone,
                    hospital_address: request.hospital_address
                });

                await hospital.save();
            }

        }

        res.json({
            message: "Hospital request updated successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error approving request",
            error: error.message
        });
    }
};


exports.rejectHospitalRequest = async (req, res) => {
    try {

        const { id } = req.params;

        const updatedRequest = await HospitalRequestModel.findByIdAndUpdate(
            id,
            { request_status: "rejected" },
            { returnDocument: "after" }
        );

        if (!updatedRequest) {
            return res.json({
                message: "Hospital request not found"
            });
        }

        res.json({
            message: "Hospital request rejected successfully",
            data: updatedRequest
        });

    } catch (error) {
        console.error("Error rejecting hospital request:", error);

        res.json({
            message: "Internal server error"
        });
    }
};


exports.loginHospital = async (req, res) => {
    try {
        const { hospital_email, hospital_pass } = req.body;

        // Find hospital by email
        const hospital = await HospitalModel.findOne({ hospital_email });
        if (!hospital) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(hospital_pass, hospital.hospital_pass);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { hospitalId: hospital._id },
            process.env.JWT_SECRET,
            { expiresIn: '6h' }
        );

        res.json({
            message: "Login successful",
            token,
            hospitalId: hospital._id
        });
    } catch (error) {
        console.log(error);

        console.error("Error logging in hospital:", error);
        res.json({
            message: "Internal server error"
        });
    }
};