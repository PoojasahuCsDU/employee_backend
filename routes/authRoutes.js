const express = require("express");
const {
  registerUser,
  loginAdmin,
  loginEmployee,
  resetPassword,
  getCurrentUser,
  getAllEmployees,
} = require("../controllers/authController");
const {
  authMiddleware,
  verifyToken,
  isAdmin,
} = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const User = require("../models/Users");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Add new Admin or Employee
 *     description: Add a new user (Admin or Employee) with an image.
 *     tags: [Admin,]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - empId
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 x-hintText: "e.g., user123"
 *
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *                 format: email
 *               empId:
 *                 type: string
 *               password:
 *                 type: string
 *               mobileNo:
 *                 type: string
 *                 format: phone
 *                 example: 9034567890
 *               role:
 *                 type: string
 *                 enum: [admin, employee]
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Name,EmpId, Password and Role are required fields or Invalid Role
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  authMiddleware(["admin"]),
  upload.single("image"),
  registerUser
);

router.get("/admins", verifyToken, isAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password");
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login-employee:
 *   post:
 *     summary: Employee Login
 *     tags: [Employee]
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empId
 *               - password
 *             properties:
 *               empId:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: EmployeeId and Password required
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 *
 */
router.post("/login-employee", loginEmployee);

/**
 * @swagger
 * /api/auth/login-admin:
 *   post:
 *     summary: Admin Login
 *     tags:
 *       - Admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empId
 *               - password
 *             properties:
 *               empId:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Email and Password required
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 *
 */
router.post("/login-admin", loginAdmin);

// router.post("/resetPassword", authMiddleware(["admin"]), resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user details
 *     tags: [Admin,Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/me", authMiddleware(["employee", "admin"]), getCurrentUser);

/**
 * @swagger
 * /api/auth/employees:
 *   get:
 *     summary: Get all employees
 *     description: Retrieves a list of all employees. Admin access only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d21b4667d0d8992e610c85"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       empId:
 *                         type: string
 *                         example: "EMP001"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       mobileNo:
 *                         type: string
 *                         example: "+919876543210"
 *                       role:
 *                         type: string
 *                         enum: [employee, admin]
 *                         example: "employee"
 *                       image:
 *                         type: string
 *                         example: "https://storage.googleapis.com/your-bucket/profile-images/user123.jpg"
 *                         nullable: true
 *       401:
 *         description: Unauthorized – Bearer token missing or invalid
 *       404:
 *         description: No employees found
 *       500:
 *         description: Internal server error
 */

router.get(
  "/employees",
  authMiddleware(["admin"]), // Strict admin-only access
  getAllEmployees // Handler function
);

module.exports = router;
