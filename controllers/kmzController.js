const Project = require("../models/Projects");
const User = require("../models/Users");
const generateKmzBuffer = require("../utils/generateKmzBuffer");

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

    // Filter and format waypoints
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
        gpsDetails: waypoint.gpsDetails[0], // Get first gpsDetails item
        routeType: waypoint.routeType 
      }));

    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false
      });
    }

    // Get feederName from gpsDetails
    const feederName = userWaypoints[0]?.gpsDetails?.feederName;
    if (!feederName) {
      // Debug information
      return res.status(400).json({
        message: "Feeder name not found in GPS details",
        success: false,
        debug: process.env.NODE_ENV === "development" ? {
          gpsDetailsStructure: userWaypoints[0]?.gpsDetails,
          availableFields: userWaypoints[0]?.gpsDetails ? Object.keys(userWaypoints[0].gpsDetails) : null
        } : null
      });
    }

    // Sanitize filename
    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    // Generate KMZ
    const routeType = String(userWaypoints[0]?.routeType).toLowerCase() || 'new';
    const kmzBuffer = await generateKmzBuffer(userWaypoints, routeType);

    // Send KMZ file with feederName only
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} city feeder by ${empId}.kmz`
    );
    res.setHeader("Content-Type", "application/vnd.google-earth.kmz");
    res.setHeader('Content-Length', kmzBuffer.length);
    res.send(kmzBuffer);

  } catch (err) {
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