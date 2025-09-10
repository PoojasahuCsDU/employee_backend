// helpers/imageUploadHelper.js

const { uploadImageToCloudStorage } = require("./cloudStorageHelper");// your original upload code

/**
 * Handle single image upload safely.
 * If no file provided, returns null.
 * 
 * @param {Object} req - Express request object (expects req.file)
 * @returns {Promise<string|null>} - Uploaded image URL or null
 */
const handleSingleImageUpload = async (req) => {
  if (!req.file) return null;

  return await uploadImageToCloudStorage(req.file);
};



module.exports = { handleSingleImageUpload };
