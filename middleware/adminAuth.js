const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.json({ message: "Authorization header missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.json({ message: "Admin not authenticated" });
        }
       
        req.adminId = decoded.id;
        next();
    } catch (error) {
        return res.json({ message: "Admin not authenticated" });
    }
};

module.exports = adminAuth;
