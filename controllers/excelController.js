const Project = require("../models/Projects");
const User = require("../models/Users");
const generateExcelBuffer = require("../utils/generateExcelBuffer");

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
        distanceFromPrevious: waypoint.distanceFromPrevious || 0,
        poleDetails: waypoint.poleDetails[0],
        gpsDetails: waypoint.gpsDetails[0], // Get first gpsDetails item
        routeType: waypoint.routeType,
        timestamp: waypoint.timestamp ,
      }));

    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false
      });
    }

    // Get feederName from gpsDetails
    const excelBuffer = await generateExcelBuffer(userWaypoints);

    // Sanitize filename
    const feederName = userWaypoints[0]?.gpsDetails?.feederName || 'feeder';
    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    // Send Excel file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} city feeder details by ${empId}.xlsx`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);

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