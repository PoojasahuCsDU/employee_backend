const Project = require("../models/Projects");
const User = require("../models/Users");
const generateExcelBuffer = require("../utils/generateExcelBuffer");

/**
 * Controller to generate and download Excel files for project waypoints
 * @module controllers/excelController
 */

/**
 * Downloads an Excel file containing waypoint information for a specific employee in a project.
 * The Excel file includes detailed information about waypoints, transformer details, and route information.
 *
 * @function downloadExcel
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - Unique identifier of the project
 * @param {string} req.params.empId - Employee ID of the user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends Excel file as response or error message
 *
 * @throws {400} - If projectId or empId is missing
 * @throws {404} - If employee, project, or waypoints are not found
 * @throws {403} - If employee is not part of the project
 * @throws {500} - For internal server errors
 *
 * @example
 * GET /api/downloads/excel/PRJ001/EMP123
 */
exports.downloadExcel = async (req, res) => {
  try {
    const { projectId, empId } = req.params;

    // Basic input validation
    if (!projectId || !empId) {
      return res.status(400).json({ 
        message: "Both projectId and empId are required",
        success: false
      });
    }

    // Find user and project
    const user = await User.findOne({ empId }).select('_id empId');
    if (!user) {
      return res.status(404).json({ 
        message: "Employee not found",
        success: false 
      });
    }

    const project = await Project.findOne({ projectId })
      .populate("employees", "empId")
      .populate("waypoints.createdBy", "_id");
    
    if (!project) {
      return res.status(404).json({ 
        message: "Project not found",
        success: false 
      });
    }

    // Check if employee belongs to project
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
     * @type {Array<Object>}
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
        distanceFromPrevious: waypoint.distanceFromPrevious || 0,
        poleDetails: waypoint.poleDetails[0],
        gpsDetails: waypoint.gpsDetails[0], // Get first gpsDetails item
        routeType: waypoint.routeType,
        timestamp: waypoint.timestamp,
      }));

    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false
      });
    }

    // Generate Excel buffer with waypoint data
    const excelBuffer = await generateExcelBuffer(userWaypoints);

    // Sanitize filename for safe download
    const feederName = userWaypoints[0]?.gpsDetails?.feederName || 'feeder';
    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    // Set response headers and send Excel file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} city feeder details by ${empId}.xlsx`
    );
    res.setHeader(
      "Content-Type", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);

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