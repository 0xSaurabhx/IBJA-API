const swaggerSpec = require("../config/swagger");

const handleSwaggerDocs = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle JSON spec endpoint
  if (pathname === "/api-docs/swagger.json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(swaggerSpec);
    return;
  }

  // Handle the main swagger docs page
  if (pathname === "/api-docs" || pathname === "/api-docs/") {
    const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${
      req.headers.host
    }`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IBJA API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.1/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.1/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.1/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${baseUrl}/api-docs/swagger.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout"
    });
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
    return;
  }

  // Default response for invalid paths
  res.status(404).json({
    error: "Swagger documentation not found",
    message: "Visit /api-docs for API documentation",
    endpoints: {
      documentation: "/api-docs",
      spec: "/api-docs/swagger.json",
    },
  });
};

module.exports = handleSwaggerDocs;
