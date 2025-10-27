const axios = require("axios");
const cheerio = require("cheerio");
const { generalLimiter, applyRateLimit } = require("./_rateLimiter"); // Import rate limiter
const {
  generateRSSFeed,
  getMonthFilter,
  filterItemsByMonth,
} = require("./_rssUtils");

const GOLD_IDS = [
  "lblGold999_AM",
  "lblGold995_AM",
  "lblGold916_AM",
  "lblGold750_AM",
  "lblGold585_AM",
  "lblGold585_PM",
  "lblGold750_PM",
  "lblGold916_PM",
  "lblGold995_PM",
  "lblGold999_PM",
];

// Core logic for fetching latest gold rates
const handleLatestGoldRequest = async (req, res) => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    const result = {};
    GOLD_IDS.forEach((id) => {
      const text = $(`#${id}`).text().trim();
      result[id] = text || null; // Ensure null if empty
    });

    // Check if any rates were found - crucial for robustness
    const foundRates = Object.values(result).some((rate) => rate !== null);
    if (!foundRates) {
      // Fallback or error if no rates are found on the page
      console.warn("No gold rates found on the page.");
      // Consider fetching historical data as fallback if needed
      return res
        .status(404)
        .json({ error: "Live gold rates not available currently." });
    }

    const now = new Date();

    // Cache header
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate"); // 2 hours
    res.status(200).json({
      date: now.toISOString().split("T")[0],
      ...result,
    });
  } catch (error) {
    console.error("Error scraping gold rates:", error.message);
    res.status(500).json({ error: "Failed to fetch gold rates" });
  }
};

// RSS feed handler for gold rates
const handleGoldRSSFeed = async (req, res) => {
  try {
    const monthFilter = getMonthFilter(req);

    // Get historical data for RSS feed
    const historicalData = await getHistoricalGoldData();

    if (
      !historicalData ||
      (historicalData.am.length === 0 && historicalData.pm.length === 0)
    ) {
      return res
        .status(404)
        .json({ error: "Gold rates not available for RSS feed" });
    }

    // Combine AM and PM data into RSS items
    let allItems = [];

    // Add AM data
    historicalData.am.forEach((item) => {
      if (item.gold_999 || item.gold_916) {
        allItems.push({
          title: `Gold Rates - ${item.date} (AM)`,
          description: `AM IBJA Gold Rates: 999: ₹${
            item.gold_999 || "N/A"
          }, 916: ₹${item.gold_916 || "N/A"}, 995: ₹${item.gold_995 || "N/A"}`,
          date: item.date,
        });
      }
    });

    // Add PM data
    historicalData.pm.forEach((item) => {
      if (item.gold_999 || item.gold_916) {
        allItems.push({
          title: `Gold Rates - ${item.date} (PM)`,
          description: `PM IBJA Gold Rates: 999: ₹${
            item.gold_999 || "N/A"
          }, 916: ₹${item.gold_916 || "N/A"}, 995: ₹${item.gold_995 || "N/A"}`,
          date: item.date,
        });
      }
    });

    // Apply month filter if provided
    const filteredItems = filterItemsByMonth(allItems, monthFilter);

    if (filteredItems.length === 0) {
      return res.status(404).json({
        error: monthFilter
          ? `No gold rate data available for ${monthFilter.monthString}`
          : "No gold rate data available",
        availableItems: allItems.length,
      });
    }

    const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${
      req.headers.host
    }`;
    const rssContent = generateRSSFeed(
      "IBJA Gold Rates RSS Feed",
      "Historical and current gold rates from India Bullion and Jewellers Association (IBJA)",
      filteredItems,
      baseUrl,
      "/latest"
    );

    res.setHeader("Content-Type", "application/rss+xml; charset=UTF-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // 1 hour cache for RSS
    res.status(200).send(rssContent);
  } catch (error) {
    console.error("Error generating gold RSS feed:", error.message);
    res.status(500).json({ error: "Failed to generate RSS feed" });
  }
};

// Helper function to get current gold rates
const getCurrentGoldRates = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    const result = {};
    GOLD_IDS.forEach((id) => {
      const text = $(`#${id}`).text().trim();
      result[id] = text || null;
    });

    const foundRates = Object.values(result).some((rate) => rate !== null);
    if (!foundRates) return null;

    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      ...result,
    };
  } catch (error) {
    console.error("Error fetching current gold rates:", error.message);
    return null;
  }
};

// Helper function to get historical gold data
const getHistoricalGoldData = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    const parseTable = (tabId) => {
      const rows = $(`${tabId} table tbody tr`);
      const history = [];

      rows.each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length === 7) {
          const gold_999 = $(cells[1]).text().trim();
          const gold_916 = $(cells[3]).text().trim();
          const dateText = $(cells[0]).text().trim().replace(/\n/g, "");

          if ((gold_999 || gold_916) && dateText) {
            history.push({
              date: dateText,
              gold_999: gold_999 || null,
              gold_995: $(cells[2]).text().trim() || null,
              gold_916: gold_916 || null,
              gold_750: $(cells[4]).text().trim() || null,
              gold_585: $(cells[5]).text().trim() || null,
            });
          }
        }
      });
      return history;
    };

    const am = parseTable("#tab-am");
    const pm = parseTable("#tab-pm");

    return { am, pm };
  } catch (error) {
    console.error("Error fetching historical gold data:", error.message);
    return { am: [], pm: [] };
  }
};

// Main export - acts as a router and applies middleware
module.exports = async (req, res) => {
  const urlPath = req.url.split("?")[0]; // Ignore query params for routing

  if (urlPath === "/" || urlPath === "") {
    // Root route - no rate limiting needed here
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate");
    res.status(200).json({
      message: "Welcome to the IBJA Gold API",
      documentation: "/api-docs",
      endpoint1: "/latest",
      endpoint2: "/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)",
      endpoint3: "/history",
      endpoint4: "/silver",
      endpoint5: "/silver/latest",
      endpoint6: "/silver/latest/rss",
      endpoint7: "/uptime",
      endpoint8: "/convert",
      endpoint9: "/platinum",
      endpoint10: "/platinum/latest",
      endpoint11: "/platinum/latest/rss",
      endpoint12: "/pdf",
      endpoint13: "/chart",
      endpoint14: "/changes",
      endpoint15: "/changes/hourly",
      endpoint16: "/changes/weekly",
      endpoint17: "/changes/highs",
      description: "Fetches IBJA gold rates in India",
    });
    return;
  }

  if (urlPath === "/latest/rss") {
    // Apply rate limiter for RSS feed
    applyRateLimit(generalLimiter)(req, res, () => handleGoldRSSFeed(req, res));
    return;
  }

  if (urlPath === "/latest") {
    // Apply the general rate limiter middleware
    applyRateLimit(generalLimiter)(req, res, () =>
      handleLatestGoldRequest(req, res)
    );
    return;
  }

  // Fallback for unknown routes directed to this file by vercel.json
  res.status(404).json({ error: "Endpoint not found" });
};
