const express = require("express");
const {
  createProject,
  assignEmployee,
  getMyProjects,
  addWaypoint,
  getProjectWaypoints,
  updateWaypoint,
  allProjects,
  getAllWaypointsEmployee,
} = require("../controllers/projectController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const router = express.Router();

/**
 * @swagger
 * /api/projects/create-project:
 *   post:
 *     summary: Create a new project
 *     description: Create a new project with division, cirlce and description. Only admin can create projects.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - circle
 *               - division
 *             properties:
 *               circle:
 *                 type: string
 *                 description: Circle of the project
 *               division:
 *                 type: string
 *                 description: Division of the project
 *               description:
 *                 type: string
 *                 description: Description of the project
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Circle and Division fields are required or Project with this name already exists
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       403:
 *         description: Forbidden - Only admin can create projects
 *       500:
 *         description: Internal server error
 */
router.post("/create-project", authMiddleware("admin"), createProject);
/**
 * @swagger
 * /api/projects/{projectId}/assign:
 *   post:
 *     summary: Assign an employee to a project
 *     description: Assign an employee to a project by their empId. Only admin can assign employees.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         description: ID of the project to which the employee will be assigned
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empId
 *             properties:
 *               empId:
 *                 type: string
 *                 description: Employee ID of the user to be assigned to the project
 *     responses:
 *       200:
 *         description: Employee assigned successfully
 *       400:
 *         description: Employee ID (empId) is required or Employee already assigned or Project not found or Employee not found or user doesn't have employee role
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.post("/:projectId/assign", authMiddleware("admin"), assignEmployee);
/**
 * @swagger
 * /api/projects/my-projects:
 *   get:
 *     summary: Get all projects assigned to the logged-in employee
 *     description: Retrieve all projects assigned to the logged-in employee. Only employees can access this endpoint.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects assigned to the employee
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get("/my-projects", authMiddleware("employee"), getMyProjects);

/**
 * @swagger
 * /api/projects/all-projects:
 *   get:
 *     summary: Get all projects
 *     description: Retrieve all projects. Only admin can access this endpoint.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all projects
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get("/all-projects", authMiddleware(["admin"]), allProjects);

/**
 * @swagger
 * /api/projects/{projectId}/waypoints:
 *   post:
 *     summary: Add a waypoint to a project
 *     description: Add a waypoint to a project by its ID. Only assigned employees can add waypoints.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         description: ID of the project to which the waypoint will be added
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *               - routeType  
 *               - routeStartingPoint
 *               - routeEndingPoint
 *               - poleDetails
 *               - gpsDetails
 *               - isStart
 *               - isEnd
 *
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the waypoint
 *               description:
 *                 type: string
 *                 description: Description of the waypoint
 *               distanceFromPrevious:
 *                 type: number
 *                 description: Distance from the previous waypoint in meters
 *               latitude:
 *                 type: number
 *                 description: Latitude coordinate of the waypoint
 *               longitude:
 *                 type: number
 *                 description: Longitude coordinate of the waypoint
 *               routeType:
 *                 type: String
 *                 description: Route can either be existing or new
 *               routeStartingPoint:
 *                 type: String
 *                 description: Route Starting Point
 *               routeEndingPoint:
 *                 type: String
 *                 description: Route Ending Point
 *               isStart:
 *                 type: boolean
 *                 description: Indicates if this waypoint is the starting point
 *                 default: false
 *               isEnd:
 *                 type: boolean
 *                 description: Indicates if this waypoint is the ending point
 *                 default: false
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image URL of the waypoint
 *               poleDetails:
 *                 type: string
 *                 description: JSON stringified array of pole details. 
 *                 example: '[{"poleNo":1,"poleType":"wood"}]'
 *               gpsDetails:
 *                 type: string
 *                 description: JSON stringified array of GPS details. 
 *                 example: '[{"transformerKV":"11KV","currentWaypointCoordinates":{"latitude":12.34,"longitude":56.78}}]'
 *                 
 *     responses:
 *       201:
 *         description: Waypoint added successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - User not assigned to project
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.post("/:projectId/waypoints", authMiddleware("employee"),upload.single("image"), addWaypoint);

/**
 * @swagger
 * /api/projects/{projectId}/waypoints:
 *   get:
 *     summary: Get all waypoints of a project
 *     description: Retrieve all waypoints of a project by project ID. When employee will access this end-point then waypoints created by him/her will be shown and if this end-points is accessed by admin then all the waypoints will be shown.
 *     tags: [Employee,Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         description: ID of the project whose waypoints will be retrieved
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of waypoints for the project
 *       401:
 *         description: Unauthorized - Bearer token missing or invalid
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:projectId/waypoints",
  authMiddleware(["employee", "admin"]),
  getProjectWaypoints
);

/**
 * @swagger
 * /api/projects/{projectId}/waypoints/{waypointId}:
 *   patch:
 *     summary: Update a waypoint of a project
 *     description: Update a waypoint of a project. Only the employee who created the waypoint can update it.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         description: ID of the project containing the waypoint
 *         schema:
 *           type: string
 *       - in: path
 *         name: waypointId
 *         required: true
 *         description: ID of the waypoint to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name of the waypoint
 *               description:
 *                 type: string
 *                 description: Updated description
 *               latitude:
 *                 type: number
 *                 description: Updated latitude coordinate
 *               longitude:
 *                 type: number
 *                 description: Updated longitude coordinate
 *               poleDetails:
 *                 type: string
 *                 description: JSON stringified array of updated pole details
 *                 example: '[{"poleNo":1,"poleType":"metal"}]'
 *               gpsDetails:
 *                 type: string
 *                 description: JSON stringified array of updated GPS details
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: New image file
 *     responses:
 *       200:
 *         description: Waypoint updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not the waypoint creator
 *       404:
 *         description: Project or waypoint not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/projects/employee-waypoints:
 *   get:
 *     summary: Get all waypoints created by an employee across projects
 *     description: Retrieve all waypoints created by the employee (empId) across all projects they are assigned to.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of waypoints created by the employee across projects
 *       401:  
 *         description: Unauthorized - Bearer token missing or invalid
 *       404:
 *         description: Employee not found with this empId
 *       500:
 *         description: Internal server error
 */
router.get(
  "/employee-waypoints",
  authMiddleware("employee"),
  getAllWaypointsEmployee
);

module.exports = router;
