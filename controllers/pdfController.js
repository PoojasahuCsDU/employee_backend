const Project = require("../models/Projects");
const User = require("../models/Users");
const generatePdfBuffer = require("../utils/generatePdfBuffer");

exports.downloadPdf = async (req, res) => {
  try {
    const { projectId, empId } = req.params;

    if (!projectId || !empId) {
      return res.status(400).json({
        message: "Both projectId and empId are required",
        success: false,
      });
    }

    const user = await User.findOne({ empId }).select("_id empId");
    if (!user) {
      return res.status(404).json({
        message: "Employee not found",
        success: false,
      });
    }

    const project = await Project.findOne({ projectId })
      .populate("employees", "empId")
      .populate("waypoints.createdBy", "_id");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
        success: false,
      });
    }

    const isEmployeeInProject = project.employees.some(
      (emp) => emp.empId === empId
    );
    if (!isEmployeeInProject) {
      return res.status(403).json({
        message: "Employee is not part of this project",
        success: false,
      });
    }

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

    if (userWaypoints.length === 0) {
      return res.status(404).json({
        message: "No waypoints found for this employee in the project",
        success: false,
      });
    }

    const feederName = userWaypoints[0]?.gpsDetails?.feederName;
    if (!feederName) {
      return res.status(400).json({
        message: "Feeder name not found in GPS details",
        success: false,
      });
    }

    const sanitizedFeederName = feederName
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .substring(0, 50);

    const pdfBuffer = await generatePdfBuffer(userWaypoints);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sanitizedFeederName} waypoints by ${empId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
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
