const User = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { handleSingleImageUpload } = require("../utils/imageUploadHelper");
const rateLimit = require("express-rate-limit");
const sanitize = require("mongo-sanitize");

// Admin-specific security enhancements

//controller function to register a new user(only admin can register a new user)
exports.registerUser = async (req, res) => {
  try {
    // Sanitize inputs to prevent injection attacks
    const cleanBody = sanitize(req.body);
    const { name, empId, password, email, mobileNo, role } = cleanBody;

    // Input validation
    if (!name || !password || !role || !email) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing (name, password, role, email).",
      });
    }

    if (!["admin", "employee"].includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid role specified. Only 'admin' or 'employee' are allowed.",
      });
    }

    // Additional validation for admin registration
    if (role === "admin") {
      if (!req.user || req.user.role !== "admin") {
        console.warn(`Unauthorized admin creation attempt from IP: ${req.ip}`);
        return res.status(403).json({
          success: false,
          message: "Admin privileges required",
        });
      }
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ $or: [{ empId }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the provided empId or email.",
      });
    }

    // Handle image upload if available
    const imageUrl = await handleSingleImageUpload(req);

    // Create a new user object
    const newUser = new User({
      name: name.trim(),
      empId,
      password, // Assuming you're hashing the password before saving
      email: email.toLowerCase(),
      mobileNo,
      role,
      image: imageUrl, // Save the image URL to the DB
    });

    // Save user to the database
    await newUser.save();

    // Log the registration action (for auditing or tracking)
    console.log(`${newUser.role} user registered: ${newUser.email}`);

    // Respond with the success message
    res.status(201).json({
      success: true,
      message: `${
        newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)
      } registered successfully.`,
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        image: newUser.image, // Optionally return image URL in response
      },
    });
  } catch (error) {
    // Log error details for debugging
    console.error("User registration error:", error);

    // Handle errors gracefully and send response to the client
    res.status(500).json({
      success: false,
      message:
        error.message || "Internal server error. Please try again later.",
    });
  }
};

// Enhanced admin login with security features
//controller function to login an admin
exports.loginAdmin = async (req, res) => {
  const { empId, password } = sanitize(req.body);

  if (!empId || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required",
    });
  }

  try {
    const user = await User.findOne({
      empId: { $regex: new RegExp(`^${empId}$`, "i") },
      role: "admin",
    });

    if (!user) {
      console.warn(
        `Failed admin login attempt for: ${empId} from IP: ${req.ip}`
      );
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`Failed password attempt for admin: ${empId}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Secure cookie settings
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN || "localhost",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Keep existing employee login unchanged
//controller function to login an employee
exports.loginEmployee = async (req, res) => {
  const { empId, password } = req.body;
  if (!empId || !password) {
    return res
      .status(400)
      .json({ message: "Employee ID and Password required" });
  }
  try {
    const user = await User.findOne({ empId });
    if (
      !user ||
      user.role !== "employee" ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Enhanced getCurrentUser with admin checks
//controller function to get the current user details
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password -_id -__v");

    if (!user) {
      console.warn(`User not found for ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Additional security logging for admin access
    if (user.role === "admin") {
      console.log(`Admin access: ${user.email} accessed profile`);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin-specific rate limiter
exports.adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for admin endpoint: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later",
    });
  },
});

//Fetches all employees with role 'employee' from the database
exports.getAllEmployees = async (req, res) => {
  try {
    // Query employees with lean() for better performance since we just need plain objects
    const employees = await User.find({ role: "employee" })
      .select("-password -__v")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    // Log full error for debugging but send generic message to client
    console.error("[EmployeeController] Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee list",
    });
  }
};
