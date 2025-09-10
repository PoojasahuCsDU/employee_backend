const Project = require("../models/Projects");
const User = require("../models/Users");
const generateKmzBuffer = require("../utils/generateKmzBuffer");

/**
 * Controller to generate and download KMZ files for project waypoints
 * @module controllers/kmzController
 */

/**
 * Downloads a KMZ file containing waypoint information for a specific employee in a project.
 * The KMZ file can be opened in Google Earth to visualize the waypoints and routes.
 *
 * @function downloadKmz
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - Unique identifier of the project
 * @param {string} req.params.empId - Employee ID of the user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends KMZ file as response or error message
 *
 * @throws {400} - If projectId or empId is missing, or if feeder name is not found
 * @throws {404} - If employee, project, or waypoints are not found
 * @throws {403} - If employee is not part of the project
 * @throws {500} - For internal server errors
 *
 * @example
 * GET /api/downloads/kmz/PRJ001/EMP123
 */
exports.downloadKmz = async (req, res) => {
  try {
    const { projectId, empId } = req.params;

    // Basic input validation
    if (!projectId || !empId) {
      return res.status(400).json({ 
        message: "Both projectId and empId are required",
        success: false
      });
    }

    // Find user and validate existence
    const user = await User.findOne({ empId }).select('_id empId');
    if (!user) {
      return res.status(404).json({ 
        message: "Employee not found",
        success: false 
      });
    }

    // Find project and populate related data
    const project = await Project.findOne({ projectId })
      .populate("employees", "empId")
      .populate("waypoints.createdBy", "_id");
    
    if (!project) {
      return res.status(404).json({ 
        message: "Project not found",
        success: false 
      });
    }

    // Verify employee project association
    const isEmployeeInProject = project.employees.some(
      emp => emp.empId === empId
    );
    if (!isEmployeeInProject) {
      return res.status(403).json({ 
        message: "Employee is not part of this project",
        success: false 
      });
    }

    /**
     * Filter and format waypoints for the specific employee
     * Includes location, description, transformer details, and route information
     */
    const userWaypoints = project.waypoints
      .flat()
      .filter(waypoint => 
        waypoint.createdBy && 
        waypoint.createdBy._id.toString() === user._id.toString()
      )
      .map(waypoint => ({
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
        name: waypoint.name || `Waypoint ${waypoint._id}`,
        description: waypoint.description || "",
        transformerType: waypoint.transformerType,
        poleDetails: waypoint.poleDetails,
        gpsDetails: waypoint.gpsDetails[0], 
        routeType: waypoint.routeType 
      }));

    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false
      });
    }

    // Extract and validate feeder name
    const feederName = userWaypoints[0]?.gpsDetails?.feederName;
    if (!feederName) {
      return res.status(400).json({
        message: "Feeder name not found in GPS details",
        success: false,
        debug: process.env.NODE_ENV === "development" ? {
          gpsDetailsStructure: userWaypoints[0]?.gpsDetails,
          availableFields: userWaypoints[0]?.gpsDetails ? Object.keys(userWaypoints[0].gpsDetails) : null
        } : null
      });
    }

    // Sanitize filename for safe download
    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    // Generate KMZ with appropriate route type
    const routeType = String(userWaypoints[0]?.routeType).toLowerCase() || 'new';
    const kmzBuffer = await generateKmzBuffer(userWaypoints, routeType);

    // Set response headers and send KMZ file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} city feeder by ${empId}.kmz`
    );
    res.setHeader("Content-Type", "application/vnd.google-earth.kmz");
    res.setHeader('Content-Length', kmzBuffer.length);
    res.send(kmzBuffer);

  } catch (err) {
    // Error handling with additional debug info in development
    res.status(500).json({
      message: "Internal Server Error",
      success: false,
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack
      })
    });
  }
};