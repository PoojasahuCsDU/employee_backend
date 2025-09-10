const User = require("../models/Users");
const bcrypt = require("bcrypt");
const { handleSingleImageUpload } = require("../utils/imageUploadHelper");
const { deleteImageFromCloudStorage } = require("../utils/cloudStorageHelper");
const sanitize = require("mongo-sanitize");

// Controller to fetch user by empId
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

// Controller to update user details
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
