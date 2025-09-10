
const multer = require("multer");

// We are using memory storage because you are uploading directly to Google Cloud
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (optional)
  },
});

module.exports = upload;
