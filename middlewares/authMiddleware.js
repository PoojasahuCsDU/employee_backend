const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { RateLimiterMemory } = require("rate-limiter-flexible");

// Rate Limiter
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Main Middleware Function (Role-Based)
const authMiddleware = (roles) => async (req, res, next) => {
  try {
    //await rateLimiter.consume(req.ip);

    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided or invalid format",
      });
    }

    const token = authHeader.split(" ")[1];
    const decode = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      ignoreExpiration: false,
    });

    if (!decode.id || !decode.role) {
      throw new Error("Invalid token payload");
    }

    req.user = await User.findById(decode.id).select("-password");
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (roles && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
};

//  Basic Token Verification Middleware (No role check)
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decode.id).select("-password");
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Admin Role Check Middleware (Assumes verifyToken ran before)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// Export all middleware functions properly
module.exports = {
  authMiddleware,
  verifyToken,
  isAdmin,
};
