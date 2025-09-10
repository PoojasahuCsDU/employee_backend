require("dotenv").config();
const express = require("express");
const connectDB = require("./config/dbconfig");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const { swaggerUI, swaggerSpec } = require("./swagger");
// Import route modules
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const userRoutes = require("./routes/userRoutes");
const downloadRoutes = require("./routes/downloadRoutes");

// Configure port
const PORT = process.env.PORT || 8080;

// Connect to database
connectDB();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://ems-frontend-369113394426.asia-south2.run.app",
  "https://ems-backend-369113394426.asia-south2.run.app",
];

// Enhanced CORS configuration
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["set-cookie","Content-Disposition"],
};

// Security middleware
app.use(helmet()); // Add basic security headers
app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/downloads", downloadRoutes);


app.use("/", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);

// Swagger UI - MOVED AFTER API ROUTES
app.use("/", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  // Don't crash the server, but log the error
});

module.exports = app; // Export for testing purposes
