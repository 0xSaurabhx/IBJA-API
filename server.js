const express = require("express");
const path = require("path");

// Import all API handlers
const indexHandler = require("./api/index");
const chartHandler = require("./api/chart");
const convertHandler = require("./api/convert");
const historyHandler = require("./api/history");
const pdfHandler = require("./api/pdf");
const platinumHandler = require("./api/platinum");
const silverHandler = require("./api/silver");
const uptimeHandler = require("./api/uptime");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for local development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper function to wrap async handlers
const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Root routes
app.get("/", asyncHandler(indexHandler));
app.get("/latest", asyncHandler(indexHandler));

// Direct routes without /api prefix (to match Vercel structure)
app.get("/chart", asyncHandler(chartHandler));
app.get("/chart/comparison", asyncHandler(chartHandler));
app.get("/convert", asyncHandler(convertHandler));
app.get("/history", asyncHandler(historyHandler));
app.get("/pdf", asyncHandler(pdfHandler));
app.get("/pdf/last30", asyncHandler(pdfHandler));
app.get("/platinum", asyncHandler(platinumHandler));
app.get("/platinum/latest", asyncHandler(platinumHandler));
app.get("/silver", asyncHandler(silverHandler));
app.get("/silver/latest", asyncHandler(silverHandler));
app.get("/uptime", asyncHandler(uptimeHandler));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: [
      "/",
      "/latest",
      "/chart",
      "/chart/comparison",
      "/convert",
      "/history",
      "/pdf",
      "/pdf/last30",
      "/platinum",
      "/platinum/latest",
      "/silver",
      "/silver/latest",
      "/uptime",
    ],
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 IBJA API Server running on http://localhost:${PORT}`);
});

module.exports = app;
