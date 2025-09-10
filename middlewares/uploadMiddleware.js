/**
 * File Upload Middleware Configuration
 * @module middlewares/uploadMiddleware
 * 
 * Configures multer for handling file uploads with:
 * - In-memory storage for Google Cloud Storage integration
 * - File size limits
 * - File type validation (if needed)
 */

const multer = require("multer");

/**
 * Multer storage configuration
 * Using memory storage for direct Google Cloud Storage uploads
 * Avoids temporary file storage on disk
 */
const storage = multer.memoryStorage();

/**
 * Configured multer middleware
 * @constant {Object} upload
 * 
 * @property {Object} storage - In-memory storage configuration
 * @property {Object} limits - Upload restrictions
 * @property {number} limits.fileSize - Maximum file size in bytes (5MB)
 * 
 * @example
 * // Single file upload
 * router.post('/upload', upload.single('image'), controller);
 * 
 * // Multiple files upload
 * router.post('/upload-many', upload.array('images', 5), controller);
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
