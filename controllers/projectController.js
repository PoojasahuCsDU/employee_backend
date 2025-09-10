const Project = require("../models/Projects");
const User = require("../models/Users");
const { handleSingleImageUpload } = require("../utils/imageUploadHelper");

//controller function to create a new project(only admin can create a new project)
exports.createProject = async (req, res) => {
  try {
    const { projectId, circle, division, description } = req.body;

    if (!circle || !division) {
      return res
        .status(400)
        .json({ message: "Circle and Division fields are required" });
    }
    const existingProject = await Project.findOne({ projectId });
    if (existingProject) {
      return res
        .status(400)
        .json({ message: "Project with this name already exists" });
    }

    const project = await Project.create({
      projectId,
      circle,
      division,
      description,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Project Created successfully", project });
  } catch (error) {
    res.status(400).json({ message: "Error creating project", error });
  }
};

//controller function to assign an employee to a project(only admin can assign an employee to a project)
exports.assignEmployee = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { empId } = req.body;

    if (!empId) {
      return res
        .status(400)
        .json({ message: "Employee ID (empId) is required" });
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const employee = await User.findOne({ empId, role: "employee" });
    if (!employee) {
      return res.status(404).json({
        message: "Employee not found or user doesn't have employee role",
      });
    }

    if (project.employees.some((emp) => emp.equals(employee._id))) {
      return res.status(400).json({ message: "Employee already assigned" });
    }

    project.employees.push(employee._id);
    await project.save();

    const updatedProject = await Project.findOne({ projectId }).populate(
      "employees",
      "name empId -_id"
    );

    res.status(200).json({
      message: "Employee assigned successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error assigning employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//controller function to get all projects assigned to an employee
//(only employee can get all projects assigned to him)
exports.getMyProjects = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      employees: userId,
    })
      .select("projectId name description circle division")
      .populate("createdBy", "name email");

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        message: "No projects found for this employee",
      });
    }

    res.status(200).json({
      message: "Projects retrieved successfully",
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Error fetching employee projects:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

//controller function to add a waypoint to a project(only employee can add a waypoint to a project)
exports.addWaypoint = async (req, res) => {
  try {
    const { projectId } = req.params;
    const employeeId = req.user._id;

    const project = await Project.findOne({ projectId });
    if (!project) {
      console.log("Project not found for ID:", projectId);
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if employee is assigned to the project
    if (!project.employees.includes(employeeId)) {
      console.log("Employee not assigned to project:", employeeId);
      return res.status(403).json({ message: "Not assigned to this project" });
    }

    const {
      name,
      description,
      distanceFromPrevious,
      latitude,
      longitude,
      isStart,
      isEnd,
      poleDetails,
      gpsDetails,
      routeType,
      routeStartingPoint,
      routeEndingPoint,
    } = req.body;

    // Parse numerical values
    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);
    const parsedIsStart = isStart === "true" || isStart === true;
    const parsedIsEnd = isEnd === "true" || isEnd === true;
    const parsedDistance = parseFloat(distanceFromPrevious);

    // Helper function to clean and parse JSON strings
    const parseJsonField = (field, fieldName) => {
      try {
        // If field is already an object/array (when sending raw JSON)
        if (typeof field === "object") {
          return field;
        }

        // If field is a string (when using form-data)
        if (typeof field === "string") {
          const parsed = JSON.parse(field);
          if (!Array.isArray(parsed)) {
            throw new Error(`${fieldName} must be an array`);
          }
          return parsed;
        }

        throw new Error(`Invalid ${fieldName} format`);
      } catch (e) {
        console.error(`Failed to parse ${fieldName}:`, field, e);
        throw new Error(`Invalid ${fieldName} format`);
      }
    };

    let parsedPoleDetails, parsedGpsDetails;
    try {
      parsedPoleDetails = poleDetails
        ? parseJsonField(poleDetails, "poleDetails")
        : [];
      parsedGpsDetails = gpsDetails
        ? parseJsonField(gpsDetails, "gpsDetails")
        : [];
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    // Validate required fields
    if (
      !name ||
      isNaN(parsedLatitude) ||
      isNaN(parsedLongitude) ||
      isStart == null ||
      isEnd == null ||
      !routeType ||
      !routeStartingPoint ||
      !routeEndingPoint
    ) {
      console.log("Missing required fields:", {
        name,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        isStart,
        isEnd,
      });
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Handle image upload
    let imageUrl = null;
    try {
      if (req.file || (req.files && Object.keys(req.files).length > 0)) {
        imageUrl = await handleSingleImageUpload(req);
        console.log("Image uploaded successfully:", imageUrl);
      } else {
        console.log("No image file provided. Skipping upload.");
      }
    } catch (uploadError) {
      console.error("Image upload failed:", uploadError);
      return res.status(400).json({ message: "Image upload failed" });
    }

    const waypoint = {
      name,
      description,
      distanceFromPrevious: parsedDistance,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      isStart: parsedIsStart,
      isEnd: parsedIsEnd,
      image: imageUrl,
      poleDetails: parsedPoleDetails,
      gpsDetails: parsedGpsDetails,
      routeType,
      routeStartingPoint,
      routeEndingPoint,
      createdBy: employeeId,
      timestamp: new Date(),
      pathOwner: employeeId,
    };

    console.log("New waypoint:", waypoint);

    // Handle waypoint addition to project
    const userPaths = project.waypoints.filter(
      (path) => path[0].pathOwner?.toString() === employeeId.toString()
    );

    const lastUserPath = userPaths[userPaths.length - 1];
    const hasIncompletePath =
      lastUserPath && !lastUserPath[lastUserPath.length - 1].isEnd;

    if (parsedIsStart) {
      // Prevent user from starting a new path if previous path isn't completed
      if (hasIncompletePath) {
        return res.status(400).json({
          message: "Cannot start a new path. Your last path is not complete.",
        });
      }

      // Valid start of a new path
      waypoint.pathOwner = employeeId;
      project.waypoints.push([waypoint]);
      console.log("Started new path for user");
    } else if (parsedIsEnd) {
      // Prevent adding an end without a path
      if (!hasIncompletePath) {
        return res.status(400).json({
          message: "Cannot end a path that hasn't started.",
        });
      }

      lastUserPath.push(waypoint);
      console.log("Ended the current user path");
    } else {
      // Midpoint logic
      if (!hasIncompletePath) {
        return res.status(400).json({
          message:
            "No active path found. Start a new path with isStart: true before adding midpoints.",
        });
      }

      lastUserPath.push(waypoint);
      console.log("Added to existing user path");
    }

    await project.save();
    console.log("Project saved successfully");
    res.status(201).json({ message: "Waypoint added successfully", waypoint });
  } catch (error) {
    console.error("Full error stack:", error.stack); // Log full error stack
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//controller function to get all waypoints of a project(only admin and employee can get all waypoints of a project)
//(admin can get all waypoints of a project and employee can get only his waypoints)
exports.getProjectWaypoints = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role, _id: userId } = req.user;

    // Find project with populated employees if needed
    const project = await Project.findOne({ projectId })
      .select("waypoints employees")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Authorization check
    if (
      role === "employee" &&
      !project.employees.some((id) => id.equals(userId))
    ) {
      return res.status(403).json({
        message: "Not authorized to access this project",
      });
    }

    // Filter waypoints based on role
    let filteredWaypoints;
    if (role === "admin") {
      // Admin gets all waypoints
      filteredWaypoints = project.waypoints;
    } else {
      // Employee gets only their paths (entire paths they started)
      filteredWaypoints = project.waypoints.filter(
        (path) => path.length > 0 && path[0].createdBy.equals(userId)
      );
    }

    res.status(200).json({
      success: true,
      waypoints: filteredWaypoints,
    });
  } catch (error) {
    console.error("Error fetching waypoints:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// exports.updateWaypoint = async (req, res) => {
//   try {
//     const { projectId, waypointId } = req.params;
//     const { coordinates, notes, images } = req.body;
//     const employeeId = req.user._id;

//     if (!coordinates && !notes && !images) {
//       return res.status(400).json({ message: "No fields to update provided" });
//     }

//     const updateFields = {};
//     if (coordinates) {
//       if (!Array.isArray(coordinates) || coordinates.length !== 2) {
//         return res.status(400).json({
//           message: "Invalid coordinates format. Use [longitude, latitude]",
//         });
//       }
//       updateFields["waypoints.$.coordinates"] = {
//         type: "Point",
//         coordinates: coordinates,
//       };
//     }
//     if (notes !== undefined) updateFields["waypoints.$.notes"] = notes;
//     if (images !== undefined) updateFields["waypoints.$.images"] = images;

//     const updatedProject = await Project.findOneAndUpdate(
//       {
//         _id: projectId,
//         "waypoints._id": waypointId,
//         "waypoints.createdBy": employeeId,
//       },
//       { $set: updateFields },
//       { new: true }
//     );

//     if (!updatedProject) {
//       return res.status(404).json({
//         message: "Project/waypoint not found or unauthorized to update",
//       });
//     }

//     const updatedWaypoint = updatedProject.waypoints.find(
//       (wp) => wp._id.toString() === waypointId
//     );

//     res.status(200).json({
//       message: "Waypoint updated successfully",
//       waypoint: updatedWaypoint,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

//controller function to get all projects(only admin can get all projects)
exports.allProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .select("projectId description circle division")
      .populate("createdBy", "name email")
      .populate("employees", "name empId -_id");

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        message: "No projects found",
      });
    }

    res.status(200).json({
      message: "Projects retrieved successfully",
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

//controller function to get all waypoints added by an employee)
exports.getAllWaypointsEmployee = async (req, res) => {
  try {
    const { empId } = req.user;
    const user = await User.findOne({ empId });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Fetch projects with populated waypoints
    const projects = await Project.find({ employees: user._id }).populate({
      path: "waypoints",
      populate: { path: "createdBy", select: "empId name role email" },
    });

    // Step 1: Extract ALL complete segments with project info and date
    const allSegments = [];
    projects.forEach((project) => {
      const employeeWaypoints = project.waypoints
        .flat()
        .filter((wp) => wp.createdBy?.empId === empId);

      let currentSegment = [];

      employeeWaypoints.forEach((waypoint, idx) => {
        if (waypoint.isStart) {
          currentSegment = [waypoint];
        } else if (currentSegment.length > 0) {
          currentSegment.push(waypoint);
        }

        const isLast = idx === employeeWaypoints.length - 1;

        // If isEnd, add complete segment
        if (waypoint.isEnd && currentSegment.length > 0) {
          const segmentDate = new Date(waypoint.timestamp)
            .toISOString()
            .split("T")[0];
          allSegments.push({
            projectId: project.projectId,
            circle: project.circle,
            division: project.division,
            description: project.description,
            segment: currentSegment,
            date: segmentDate,
            timestamp: waypoint.timestamp,
          });
          currentSegment = [];
        }

        // If last item and segment still open (incomplete), add it
        if (isLast && currentSegment.length > 0) {
          const segmentDate = new Date(currentSegment[0].timestamp)
            .toISOString()
            .split("T")[0];
          allSegments.push({
            projectId: project.projectId,
            circle: project.circle,
            division: project.division,
            description: project.description,
            segment: currentSegment,
            date: segmentDate,
            timestamp: currentSegment[0].timestamp,
          });
          currentSegment = [];
        }
      });
    });

    // Step 2: Sort ALL segments by timestamp (newest first)
    allSegments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Step 3: Group segments by date (newest first)
    const dateGroups = {};
    allSegments.forEach((segment) => {
      if (!dateGroups[segment.date]) {
        dateGroups[segment.date] = [];
      }
      dateGroups[segment.date].push(segment);
    });

    // Step 4: Prepare final output (sorted dates -> projects -> segments)
    const sortedDates = Object.keys(dateGroups).sort(
      (a, b) => new Date(b) - new Date(a)
    );
    const result = [];
    sortedDates.forEach((date) => {
      const projectsMap = new Map(); // Group segments by project for this date
      dateGroups[date].forEach((segment) => {
        if (!projectsMap.has(segment.projectId)) {
          projectsMap.set(segment.projectId, {
            projectId: segment.projectId,
            circle: segment.circle,
            division: segment.division,
            description: segment.description,
            waypoints: [],
          });
        }
        projectsMap.get(segment.projectId).waypoints.push(
          segment.segment.map((wp) => ({
            _id: wp._id,
            // name: wp.name,
            // description: wp.description,
            // distanceFromPrevious: wp.distanceFromPrevious,
            routeType: wp.routeType,
            routeStartingPoint: wp.routeStartingPoint,
            routeEndingPoint: wp.routeEndingPoint,
            latitude: wp.latitude,
            longitude: wp.longitude,
            isStart: wp.isStart,
            isEnd: wp.isEnd,
            image: wp.image,
            gpsDetails: wp.gpsDetails?.length ? wp.gpsDetails : [],
            poleDetails: wp.poleDetails?.length ? wp.poleDetails : [],
            timestamp: wp.timestamp,
            createdBy: wp.createdBy
              ? {
                  empId: wp.createdBy.empId,
                  name: wp.createdBy.name,
                  role: wp.createdBy.role,
                  email: wp.createdBy.email,
                }
              : null,
          }))
        );
      });
      // Add all projects for this date to the result
      result.push(...Array.from(projectsMap.values()));
    });

    res.status(200).json({
      success: true,
      empId,
      employeeName: user.name,
      projects: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch waypoints",
      error: error.message,
    });
  }
};
