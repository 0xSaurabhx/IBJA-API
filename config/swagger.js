const swaggerJSDoc = require("swagger-jsdoc");

// Determine the base URL based on environment
const getServerUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://ibja-api.vercel.app";
  }
  return "http://localhost:3000";
};

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "IBJA API",
    version: "1.0.0",
    description:
      "API for Indian Bullion & Jewellers Association gold rates and related services",
    contact: {
      name: "IBJA API Support",
      url: "https://github.com/rakshixh/IBJA-API",
    },
  },
  servers: [
    {
      url: getServerUrl(),
      description:
        process.env.NODE_ENV === "production"
          ? "Production server"
          : "Development server",
    },
  ],
  components: {
    schemas: {
      GoldRates: {
        type: "object",
        properties: {
          date: {
            type: "string",
            format: "date",
            description: "Date of the rates",
          },
          lblGold999_AM: {
            type: "string",
            description: "999 purity gold rate (AM)",
          },
          lblGold995_AM: {
            type: "string",
            description: "995 purity gold rate (AM)",
          },
          lblGold916_AM: {
            type: "string",
            description: "916 purity gold rate (AM)",
          },
          lblGold750_AM: {
            type: "string",
            description: "750 purity gold rate (AM)",
          },
          lblGold585_AM: {
            type: "string",
            description: "585 purity gold rate (AM)",
          },
          lblGold585_PM: {
            type: "string",
            description: "585 purity gold rate (PM)",
          },
          lblGold750_PM: {
            type: "string",
            description: "750 purity gold rate (PM)",
          },
          lblGold916_PM: {
            type: "string",
            description: "916 purity gold rate (PM)",
          },
          lblGold995_PM: {
            type: "string",
            description: "995 purity gold rate (PM)",
          },
          lblGold999_PM: {
            type: "string",
            description: "999 purity gold rate (PM)",
          },
        },
      },
      ChartData: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in DD/MM/YYYY format" },
          session: {
            type: "string",
            enum: ["AM", "PM"],
            description: "Trading session",
          },
          gold_999: { type: "number", description: "999 purity gold rate" },
          gold_916: { type: "number", description: "916 purity gold rate" },
          difference: {
            type: "number",
            description: "Difference between 999 and 916",
          },
          purity_ratio: {
            type: "string",
            description: "Ratio between 999 and 916 purity",
          },
        },
      },
      ConversionResult: {
        type: "object",
        properties: {
          fromCurrency: { type: "string", description: "Source currency code" },
          toCurrency: { type: "string", description: "Target currency code" },
          amount: { type: "number", description: "Amount to convert" },
          convertedAmount: { type: "number", description: "Converted amount" },
          exchangeRate: { type: "number", description: "Exchange rate used" },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Conversion timestamp",
          },
        },
      },
      PlatinumRates: {
        type: "object",
        properties: {
          date: {
            type: "string",
            format: "date",
            description: "Date of the rates",
          },
          platinum_999_AM: {
            type: "string",
            description: "999 purity platinum rate (AM)",
          },
          platinum_999_PM: {
            type: "string",
            description: "999 purity platinum rate (PM)",
          },
        },
      },
      SilverRates: {
        type: "object",
        properties: {
          date: {
            type: "string",
            format: "date",
            description: "Date of the rates",
          },
          silver_999_AM: {
            type: "string",
            description: "999 purity silver rate (AM)",
          },
          silver_999_PM: {
            type: "string",
            description: "999 purity silver rate (PM)",
          },
        },
      },
      HistoryData: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in DD/MM/YYYY format" },
          gold_999_AM: {
            type: "number",
            description: "999 purity gold rate (AM)",
          },
          gold_916_AM: {
            type: "number",
            description: "916 purity gold rate (AM)",
          },
          gold_999_PM: {
            type: "number",
            description: "999 purity gold rate (PM)",
          },
          gold_916_PM: {
            type: "number",
            description: "916 purity gold rate (PM)",
          },
        },
      },
      UptimeResponse: {
        type: "object",
        properties: {
          status: { type: "string", description: "Service status" },
          uptime: { type: "number", description: "Uptime in seconds" },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
          },
        },
      },
      RateChanges: {
        type: "object",
        properties: {
          current: {
            type: "object",
            description: "Current rate entry with timestamp",
          },
          previous: {
            type: "object",
            description: "Previous rate entry for comparison",
          },
          changes: {
            type: "object",
            description: "Rate changes with percentage and trend analysis",
          },
          summary: {
            type: "object",
            description: "Summary of overall rate changes",
          },
        },
      },
      HourlyTracking: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date being tracked" },
          hourlyData: {
            type: "object",
            description: "Rate data grouped by hour",
          },
          totalEntries: { type: "number", description: "Total data points" },
          summary: {
            type: "object",
            description: "Hourly tracking summary",
          },
        },
      },
      WeeklyTrends: {
        type: "object",
        properties: {
          current: { type: "object", description: "Current rates" },
          weekAgo: { type: "object", description: "Rates from week ago" },
          weeklyChanges: {
            type: "object",
            description: "Weekly rate changes analysis",
          },
          weeklyHighLow: {
            type: "object",
            description: "Daily high/low data for the week",
          },
          summary: {
            type: "object",
            description: "Weekly trend summary",
          },
        },
      },
      DailyHighLow: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date of high/low data" },
          highLow: {
            type: "object",
            description: "High and low rates for each metal type",
          },
          summary: {
            type: "object",
            description: "High/low summary with volatility metrics",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Error message" },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./api/*.js", "./server.js"], // Path to the API files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
