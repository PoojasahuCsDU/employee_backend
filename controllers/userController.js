const User = require("../models/Users");
const bcrypt = require("bcrypt");
const { handleSingleImageUpload } = require("../utils/imageUploadHelper");
const { deleteImageFromCloudStorage } = require("../utils/cloudStorageHelper");
const sanitize = require("mongo-sanitize");

/**
 * User Management Controller
 * @module controllers/userController
 * 
 * Handles user profile management operations including:
 * - Fetching user details
 * - Updating user profiles
 * - Managing profile images
 * Implements input sanitization and secure password handling
 */

/**
 * Fetch user details by employee ID
 * @async
 * @function getEmployeeByEmpId
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.empId - Employee ID to lookup
 * @param {Object} res - Express response object
 * @returns {Promise<void>} 
 * @throws {404} - If user not found
 * @throws {500} - For server errors
 * 
 * @example
 * GET /api/users/EMP123
 */
exports.getEmployeeByEmpId = async (req, res) => {
  try {
    const { empId } = req.params;
    const user = await User.findOne({ empId }).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Update user profile details
 * @async
 * @function updateUser
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.empId - Employee ID of user to update
 * @param {Object} req.body - Update data
 * @param {string} [req.body.name] - Updated name
 * @param {string} [req.body.email] - Updated email
 * @param {string} [req.body.password] - New password (will be hashed)
 * @param {string} [req.body.mobileNo] - Updated mobile number
 * @param {string|null} [req.body.image] - Profile image status
 * @param {Object} [req.file] - Uploaded image file
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * @throws {400} - If validation fails
 * @throws {404} - If user not found
 * @throws {500} - For server errors
 * 
 * @example
 * PATCH /api/users/EMP123
 * {
 *   "name": "Updated Name",
 *   "mobileNo": "1234567890"
 * }
 */
exports.updateUser = async (req, res) => {
  try {
    const { empId } = req.params;
    let updates = sanitize(req.body);

    if (updates.image === "null") {
      updates.image = null;
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    if (updates.mobileNo && !/^[0-9]{10}$/.test(updates.mobileNo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format",
      });
    }

    const existingUser = await User.findOne({ empId });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let imageShouldBeRemoved = updates.image === null;
    const newImageUrl = await handleSingleImageUpload(req);

    if ((imageShouldBeRemoved || newImageUrl) && existingUser.image) {
      await deleteImageFromCloudStorage(existingUser.image);
    }

    if (imageShouldBeRemoved) {
      updates.image = null;
    } else if (newImageUrl) {
      updates.image = newImageUrl;
    }

    const updatedUser = await User.findOneAndUpdate(
      { empId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        mobileNo: updatedUser.mobileNo,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @typedef {Object} UserResponse
 * @property {boolean} success - Operation success status
 * @property {string} message - Response message
 * @property {Object} [user] - User profile data
 * @property {string} user.name - User's name
 * @property {string} user.email - User's email
 * @property {string} user.role - User's role
 * @property {string} user.mobileNo - User's mobile number
 * @property {string} [user.image] - URL to user's profile image
 */

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {string} message - Error message
 * @property {string} [error] - Detailed error message (in development)
 */
