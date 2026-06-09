const jwt = require('jsonwebtoken');


const staffAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'Authorization header missing or invalid' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id || !decoded.role || !decoded.hospitalId)
            return res.status(401).json({ message: 'Invalid token payload' });

        req.staffId         = decoded.id;
        req.staffRole       = decoded.role;         
        req.staffHospitalId = decoded.hospitalId;

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized — invalid or expired token' });
    }
};

module.exports = staffAuth;