const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

/**
 * User Schema for authentication and profile management
 * @typedef {Object} User
 * @property {string} name - User's full name
 * @property {string} empId - Unique employee identifier
 * @property {string} [email] - User's email address (optional)
 * @property {string} [mobileNo] - 10-digit Indian mobile number (optional)
 * @property {string} password - Hashed password
 * @property {string} [image] - URL to user's profile image (optional)
 * @property {('admin'|'employee')} role - User's role in the system
 */
const UserSchema = new mongoose.Schema({
  name: String,
  empId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  email: { 
    type: String, 
    default: null 
  },
  mobileNo: {
    type: String,
    default: null,
    validate: {
      validator: function (v) {
        return v === null || /[0-9]{10}$/.test(v); 
      },
      message: (props) => `${props.value} is not a valid Indian mobile number!`,
    },
  },
  password: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String, 
    default: null 
  },
  role: { 
    type: String, 
    enum: ["admin", "employee"], 
    required: true 
  },
});

/**
 * Pre-save middleware to hash password before saving
 * Only hashes the password if it has been modified
 * Uses bcrypt with 10 rounds of salting
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * @typedef {import('mongoose').Model<User>} UserModel
 */
module.exports = mongoose.model("User", UserSchema);
