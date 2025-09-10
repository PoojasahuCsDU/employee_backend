const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { RateLimiterMemory } = require("rate-limiter-flexible");

/**
 * Authentication and Authorization Middleware Module
 * @module middlewares/authMiddleware
 * 
 * Provides JWT-based authentication and role-based authorization:
 * - Token verification
 * - Role-based access control
 * - Rate limiting
 * - Admin-specific routes protection
 */

/**
 * Rate limiter configuration
 * Limits requests to 5 per minute per IP address
 * @const {RateLimiterMemory}
 */
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

/**
 * Role-based authentication middleware
 * Verifies JWT token and checks user role against allowed roles
 * 
 * @function authMiddleware
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Protect route for admin only
 * router.get('/admin-route', authMiddleware(['admin']), controller);
 * 
 * // Protect route for both admin and employee
 * router.get('/shared-route', authMiddleware(['admin', 'employee']), controller);
 */
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

/**
 * Basic token verification middleware
 * Verifies JWT token without role checking
 * 
 * @function verifyToken
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 * 
 * @throws {401} - If token is missing, invalid, or expired
 */
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

/**
 * Admin role verification middleware
 * Must be used after verifyToken middleware
 * 
 * @function isAdmin
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from verifyToken middleware
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @throws {403} - If user is not an admin
 * 
 * @example
 * router.get('/admin-only', verifyToken, isAdmin, adminController);
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};

/**
 * @typedef {Object} AuthError
 * @property {boolean} success - Always false for errors
 * @property {string} message - Error description
 */

module.exports = {
  authMiddleware,
  verifyToken,
  isAdmin,
};
