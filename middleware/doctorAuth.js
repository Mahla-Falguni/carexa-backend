const jwt = require('jsonwebtoken');


const doctorAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.doctorId = decoded.doctorId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized access' });
    }
};


module.exports = doctorAuth;