const axios = require("axios");
const cheerio = require("cheerio");
const { generalLimiter, applyRateLimit } = require("./_rateLimiter"); // Import rate limiter
const {
  generateRSSFeed,
  getMonthFilter,
  filterItemsByMonth,
} = require("./_rssUtils");

// Core logic for fetching platinum rates
const handlePlatinumRequest = async (req, res) => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    // Find platinum rate from specific ID if available
    let platinumRate = $(`#lblPlatinum999`).text().trim() || null; // Check for a specific ID first

    // Fallback: Find platinum rate from table structure if ID fails
    if (!platinumRate) {
      console.log("Platinum label not found, parsing from table...");
      $("tr")
        .filter((i, elem) => {
          // More specific check for the row containing 'Platinum 999'
          return (
            $(elem).find("td:first-child").text().trim().toUpperCase() ===
            "PLATINUM 999"
          );
        })
        .each((i, elem) => {
          const cells = $(elem).find("td");
          // Assuming rate is in the 3rd cell (index 2)
          if (cells.length >= 3) {
            const rateText = $(cells[2]).text().trim().replace(/,/g, ""); // Remove commas
            // Basic validation: check if it looks like a number
            if (rateText && !isNaN(parseFloat(rateText))) {
              platinumRate = rateText;
              return false; // Stop searching once found
            }
          }
        });
    }

    if (!platinumRate) {
      console.warn("No platinum rate found.");
      return res
        .status(404)
        .json({ error: "Platinum rate not available currently." });
    }

    const now = new Date();

    // Cache header
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate"); // 2 hours
    res.status(200).json({
      date: now.toISOString().split("T")[0],
      // IBJA site often shows one rate; duplicate for AM/PM for consistency
      lblPlatinum999_AM: platinumRate,
      lblPlatinum999_PM: platinumRate,
    });
  } catch (error) {
    console.error("Error scraping platinum rates:", error.message);
    res.status(500).json({ error: "Failed to fetch platinum rates" });
  }
};

// RSS feed handler for platinum rates
const handlePlatinumRSSFeed = async (req, res) => {
  try {
    const monthFilter = getMonthFilter(req);

    // Get current platinum rates (platinum doesn't have historical table data like gold/silver)
    const currentRates = await getCurrentPlatinumRates();

    if (!currentRates) {
      return res
        .status(404)
        .json({ error: "Platinum rates not available for RSS feed" });
    }

    // Create RSS items with current rates
    const rssItems = [
      {
        title: `Platinum Rates - ${currentRates.date}`,
        description: `Current IBJA Platinum Rates: 999: ₹${
          currentRates.lblPlatinum999_AM || "N/A"
        }`,
        date: currentRates.date,
      },
    ];

    // Apply month filter if provided
    const filteredItems = filterItemsByMonth(rssItems, monthFilter);

    if (filteredItems.length === 0) {
      return res.status(404).json({
        error: monthFilter
          ? `No platinum rate data available for ${monthFilter.monthString}. Current data is only available for this month.`
          : "No platinum rate data available",
        note: "Platinum historical data is limited compared to gold and silver",
      });
    }

    const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${
      req.headers.host
    }`;
    const rssContent = generateRSSFeed(
      "IBJA Platinum Rates RSS Feed",
      "Current platinum rates from India Bullion and Jewellers Association (IBJA)",
      filteredItems,
      baseUrl,
      "/platinum/latest"
    );

    res.setHeader("Content-Type", "application/rss+xml; charset=UTF-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).send(rssContent);
  } catch (error) {
    console.error("Error generating platinum RSS feed:", error.message);
    res.status(500).json({ error: "Failed to generate RSS feed" });
  }
};

// Helper function to get current platinum rates
const getCurrentPlatinumRates = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    let platinumRate = $(`#lblPlatinum999`).text().trim() || null;

    // Fallback parsing if needed
    if (!platinumRate) {
      $("tr")
        .filter((i, elem) => {
          return (
            $(elem).find("td:first-child").text().trim().toUpperCase() ===
            "PLATINUM 999"
          );
        })
        .each((i, elem) => {
          const cells = $(elem).find("td");
          if (cells.length >= 3) {
            const rateText = $(cells[2]).text().trim().replace(/,/g, "");
            if (rateText && !isNaN(parseFloat(rateText))) {
              platinumRate = rateText;
              return false;
            }
          }
        });
    }

    if (!platinumRate) return null;

    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      lblPlatinum999_AM: platinumRate,
      lblPlatinum999_PM: platinumRate,
    };
  } catch (error) {
    console.error("Error fetching current platinum rates:", error.message);
    return null;
  }
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/" || urlPath === "" || urlPath === "/platinum") {
    // Root route for platinum - no rate limit
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate");
    res.status(200).json({
      message: "Welcome to the IBJA Platinum API",
      endpoint1: "/latest",
      endpoint2: "/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)",
      description: "Fetches IBJA platinum rates in India",
    });
    return;
  }

  if (urlPath.endsWith("/rss") && urlPath.includes("/latest")) {
    // RSS feed endpoint
    applyRateLimit(generalLimiter)(req, res, () =>
      handlePlatinumRSSFeed(req, res)
    );
    return;
  }

  // Assume any other path under /platinum is /latest
  if (urlPath.includes("/latest") || urlPath === "/platinum/latest") {
    applyRateLimit(generalLimiter)(req, res, () =>
      handlePlatinumRequest(req, res)
    );
    return;
  }

  // Fallback
  res.status(404).json({ error: "Endpoint not found" });
};
