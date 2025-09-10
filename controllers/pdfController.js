const Project = require("../models/Projects");
const User = require("../models/Users");
const generatePdfBuffer = require("../utils/generatePdfBuffer");

/**
 * Controller to generate and download PDF reports for project waypoints
 * @module controllers/pdfController
 */

/**
 * Downloads a PDF report containing waypoint information for a specific employee in a project
 *
 * @function downloadPdf
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - Unique identifier of the project
 * @param {string} req.params.empId - Employee ID of the user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends PDF file as response or error message
 *
 * @throws {400} - If projectId or empId is missing
 * @throws {404} - If employee, project, or waypoints are not found
 * @throws {403} - If employee is not part of the project
 * @throws {500} - For internal server errors
 *
 * @example
 * GET /api/downloads/pdf/PRJ001/EMP123
 */
exports.downloadPdf = async (req, res) => {
  try {
    // Extract parameters from request
    const { projectId, empId } = req.params;

    // Validate required parameters
    if (!projectId || !empId) {
      return res.status(400).json({
        message: "Both projectId and empId are required",
        success: false,
      });
    }

    // Find user by employee ID
    const user = await User.findOne({ empId }).select("_id empId");
    if (!user) {
      return res.status(404).json({
        message: "Employee not found",
        success: false,
      });
    }

    // Find project and populate related data
    const project = await Project.findOne({ projectId })
      .populate("employees", "empId")
      .populate("waypoints.createdBy", "_id");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        success: false,
      });
    }

    // Verify employee is assigned to the project
    const isEmployeeInProject = project.employees.some(
      (emp) => emp.empId === empId
    );
    if (!isEmployeeInProject) {
      return res.status(403).json({
        message: "Employee is not part of this project",
        success: false,
      });
    }

    // Filter waypoints created by the specific employee
    const userWaypoints = project.waypoints
      .flat()
      .filter(
        (waypoint) =>
          waypoint.createdBy &&
          waypoint.createdBy._id.toString() === user._id.toString()
      )
      .map((waypoint) => ({
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        name: waypoint.name || `Waypoint ${waypoint._id}`,
        description: waypoint.description || "",
        transformerType: waypoint.transformerType,
        poleDetails: waypoint.poleDetails,
        gpsDetails: waypoint.gpsDetails[0],
        routeType: waypoint.routeType,
      }));

    // Check if waypoints exist
    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false,
      });
    }

    // Extract and validate feeder name
    const feederName = userWaypoints[0]?.gpsDetails?.feederName;
    if (!feederName) {
      return res.status(400).json({
        message: "Feeder name not found in GPS details",
        success: false,
      });
    }

    // Sanitize feeder name for filename
    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 50);

    // Generate PDF buffer
    const pdfBuffer = await generatePdfBuffer(userWaypoints);

    // Set response headers and send PDF
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} waypoints by ${empId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    // Handle errors
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack,
      }),
    });
  }
};
