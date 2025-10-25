const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

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

// Swagger documentation route
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "IBJA API Documentation",
  })
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get latest gold rates
 *     tags: [Gold Rates]
 *     responses:
 *       200:
 *         description: Latest gold rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoldRates'
 *       404:
 *         description: Live gold rates not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/", asyncHandler(indexHandler));

/**
 * @swagger
 * /latest:
 *   get:
 *     summary: Get latest gold rates (alias)
 *     tags: [Gold Rates]
 *     responses:
 *       200:
 *         description: Latest gold rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoldRates'
 */
app.get("/latest", asyncHandler(indexHandler));

/**
 * @swagger
 * /latest/rss:
 *   get:
 *     summary: Get latest gold rates as RSS feed
 *     tags: [Gold Rates]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM format)
 *     responses:
 *       200:
 *         description: RSS feed with gold rates
 *         content:
 *           application/rss+xml:
 *             schema:
 *               type: string
 */
app.get("/latest/rss", asyncHandler(indexHandler));

/**
 * @swagger
 * /chart:
 *   get:
 *     summary: Get historical chart data for gold rates
 *     tags: [Chart Data]
 *     responses:
 *       200:
 *         description: Historical chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChartData'
 */
app.get("/chart", asyncHandler(chartHandler));

/**
 * @swagger
 * /chart/comparison:
 *   get:
 *     summary: Get comparison chart data
 *     tags: [Chart Data]
 *     responses:
 *       200:
 *         description: Comparison chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChartData'
 */
app.get("/chart/comparison", asyncHandler(chartHandler));

/**
 * @swagger
 * /convert:
 *   get:
 *     summary: Convert currency amounts
 *     tags: [Currency Conversion]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           default: INR
 *         description: Source currency code
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           default: USD
 *         description: Target currency code
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *           default: 1000
 *         description: Amount to convert
 *     responses:
 *       200:
 *         description: Conversion result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConversionResult'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/convert", asyncHandler(convertHandler));

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get historical gold rates data
 *     tags: [Historical Data]
 *     responses:
 *       200:
 *         description: Historical gold rates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HistoryData'
 */
app.get("/history", asyncHandler(historyHandler));

/**
 * @swagger
 * /pdf:
 *   get:
 *     summary: Generate PDF report of rates
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: PDF report
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
app.get("/pdf", asyncHandler(pdfHandler));

/**
 * @swagger
 * /pdf/last30:
 *   get:
 *     summary: Generate PDF report for last 30 days
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: PDF report for last 30 days
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
app.get("/pdf/last30", asyncHandler(pdfHandler));

/**
 * @swagger
 * /platinum:
 *   get:
 *     summary: Get latest platinum rates
 *     tags: [Platinum Rates]
 *     responses:
 *       200:
 *         description: Latest platinum rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatinumRates'
 */
app.get("/platinum", asyncHandler(platinumHandler));

/**
 * @swagger
 * /platinum/latest:
 *   get:
 *     summary: Get latest platinum rates (alias)
 *     tags: [Platinum Rates]
 *     responses:
 *       200:
 *         description: Latest platinum rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatinumRates'
 */
app.get("/platinum/latest", asyncHandler(platinumHandler));

/**
 * @swagger
 * /platinum/latest/rss:
 *   get:
 *     summary: Get latest platinum rates as RSS feed
 *     tags: [Platinum Rates]
 *     responses:
 *       200:
 *         description: RSS feed with platinum rates
 *         content:
 *           application/rss+xml:
 *             schema:
 *               type: string
 */
app.get("/platinum/latest/rss", asyncHandler(platinumHandler));

/**
 * @swagger
 * /silver:
 *   get:
 *     summary: Get latest silver rates
 *     tags: [Silver Rates]
 *     responses:
 *       200:
 *         description: Latest silver rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SilverRates'
 */
app.get("/silver", asyncHandler(silverHandler));

/**
 * @swagger
 * /silver/latest:
 *   get:
 *     summary: Get latest silver rates (alias)
 *     tags: [Silver Rates]
 *     responses:
 *       200:
 *         description: Latest silver rates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SilverRates'
 */
app.get("/silver/latest", asyncHandler(silverHandler));

/**
 * @swagger
 * /silver/latest/rss:
 *   get:
 *     summary: Get latest silver rates as RSS feed
 *     tags: [Silver Rates]
 *     responses:
 *       200:
 *         description: RSS feed with silver rates
 *         content:
 *           application/rss+xml:
 *             schema:
 *               type: string
 */
app.get("/silver/latest/rss", asyncHandler(silverHandler));

/**
 * @swagger
 * /uptime:
 *   get:
 *     summary: Check API uptime status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Uptime information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UptimeResponse'
 */
app.get("/uptime", asyncHandler(uptimeHandler));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    documentation: "/api-docs",
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
