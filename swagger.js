const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Survey and Employee Management API",
      version: "1.0.0",
      description:
        "API documentation for managing projects and employees for Survey",
    },
    servers: [
      {
        url: "https://ems-backend-369113394426.asia-south2.run.app",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "Bearer",
          bearerFormat: "JWT",
          description: "Please enter token",
        },
      },

      
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to your route files with Swagger comments
};
const swaggerSpec = swaggerJsDoc(options);

module.exports = {
  swaggerUI,
  swaggerSpec,
};
