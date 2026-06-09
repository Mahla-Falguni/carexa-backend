const jwt = require("jsonwebtoken");

const userAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.json({ message: "Authorization header missing or invalid" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.id) {
            return res.json({ message: "User not authenticated" });
        }
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.json({ message: "User not authenticated" });
    }
};

module.exports = userAuth;