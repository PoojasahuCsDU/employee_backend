const { Storage } = require("@google-cloud/storage");

const bucketName = process.env.GCLOUD_BUCKET_NAME;
const projectId = process.env.GCLOUD_PROJECT_ID;
const keyFilename = process.env.GCLOUD_KEY_FILE;

/**
 * Constructs a standardized error response object.
 * @param {string} message - Human-readable error message.
 * @param {number} [statusCode=400] - HTTP-like status code for the error.
 * @returns {{success:false, error:{code:number, message:string}}}
 */
const createErrorResponse = (message, statusCode = 400) => {
  return {
    success: false,
    error: {
      code: statusCode,
      message: message,
    },
  };
};

/**
 * Validates required Google Cloud Storage environment variables.
 * @returns {null | {success:false, error:{code:number, message:string}}}
 */
const validateEnvironment = () => {
  const errors = [];
  if (!bucketName)
    errors.push("GCLOUD_BUCKET_NAME environment variable is not set.");
  if (!projectId)
    errors.push("GCLOUD_PROJECT_ID environment variable is not set.");
  if (!keyFilename)
    errors.push("GCLOUD_KEY_FILE environment variable is not set.");

  if (errors.length > 0) {
    return createErrorResponse(errors.join(" "), 500);
  }
  return null;
};

const envError = validateEnvironment();
let storage, bucket;

if (!envError) {
  try {
    storage = new Storage({
      projectId,
      keyFilename,
    });
    bucket = storage.bucket(bucketName);
  } catch (error) {
    console.error("Storage initialization error:", error);
    // This will be handled when functions are called
  }
}

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png"];

/**
 * Uploads an image to Google Cloud Storage.
 * Performs environment, service, and MIME type validations.
 * @param {{ originalname: string, mimetype: string, buffer: Buffer }} file - In-memory file object (e.g., from Multer).
 * @param {string} [folder="uploads"] - Destination folder within the bucket.
 * @returns {Promise<string | {success:false, error:{code:number, message:string}}>} Public URL on success or error object.
 */
const uploadImageToCloudStorage = async (file, folder = "uploads") => {
  // Check if storage was initialized properly
  if (envError) return envError;
  if (!storage || !bucket) {
    return createErrorResponse(
      "Storage service is not properly configured.",
      500
    );
  }

  if (!file) return createErrorResponse("No file provided");
  console.log("Received file mimetype:", file.mimetype);
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return createErrorResponse(
      "Invalid file type. Only .jpg, .jpeg, and .png are allowed.",
      415 // Unsupported Media Type
    );
  }

  const sanitizedFilename = file.originalname.replace(/\s+/g, "_");
  const blob = bucket.file(`${folder}/${Date.now()}-${sanitizedFilename}`);
  const stream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
  });

  try {
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
      stream.end(file.buffer);
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    return publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    return createErrorResponse("Failed to upload image to cloud storage.", 500);
  }
};

/**
 * Deletes an image from Google Cloud Storage using its public URL.
 * @param {string} imageUrl - Public URL previously returned by the uploader.
 * @returns {Promise<{success:true} | {success:false, error:{code:number, message:string}}>} Deletion result or error object.
 */
const deleteImageFromCloudStorage = async (imageUrl) => {
  // Check if storage was initialized properly
  if (envError) return envError;
  if (!storage || !bucket) {
    return createErrorResponse(
      "Storage service is not properly configured.",
      500
    );
  }

  if (!imageUrl) return createErrorResponse("No image URL provided");

  const match = imageUrl.match(
    /https:\/\/storage\.googleapis\.com\/[^\/]+\/(.+)/
  );
  if (!match) return createErrorResponse("Invalid image URL format");

  const path = match[1];

  try {
    await bucket.file(path).delete();
    console.log(`Deleted image: ${path}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error.message);
    if (error.code === 404) {
      return createErrorResponse("Image not found in storage", 404);
    }
    return createErrorResponse("Failed to delete image", 500);
  }
};

module.exports = { uploadImageToCloudStorage, deleteImageFromCloudStorage };
