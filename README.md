# Employee Survey Management System - Backend

A Node.js backend application for managing employee surveys, waypoint tracking, and project management.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin/Employee)
  - Secure password hashing with bcrypt

- **Project Management**
  - Create and manage projects
  - Assign employees to projects
  - Track project status and details

- **Waypoint Tracking**
  - Record GPS coordinates
  - Store pole and transformer details
  - Track route information
  - Support for both existing and new routes

- **Export Functionality**
  - Export waypoint data to Excel (.xlsx)
  - Generate PDF reports
  - Create KMZ files for Google Earth visualization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **File Processing**:
  - ExcelJS for Excel generation
  - PDFKit for PDF creation
  - ADM-ZIP for KMZ file creation

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- Google Cloud Storage account (for image uploads)

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8080
DB_URI=mongodb://your-mongodb-uri
JWT_SECRET=your-jwt-secret
FRONTEND_URL=your-frontend-url
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_BUCKET=your-gcp-bucket

## Backend Deployed
https://ems-backend-369113394426.asia-south2.run.app
