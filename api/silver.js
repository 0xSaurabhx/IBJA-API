const axios = require("axios");
const cheerio = require("cheerio");
const { generalLimiter, applyRateLimit } = require("./_rateLimiter"); // Import rate limiter
const {
  generateRSSFeed,
  getMonthFilter,
  filterItemsByMonth,
} = require("./_rssUtils");

// Core logic for fetching silver rates
const handleSilverRequest = async (req, res) => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    // Try finding specific silver labels first
    let silverAM = $(`#lblSilver999_AM`).text().trim() || null;
    let silverPM = $(`#lblSilver999_PM`).text().trim() || null;

    // Fallback: If labels aren't present/updated, parse from history table
    if (!silverAM && !silverPM) {
      console.log("Silver labels not found, parsing from history table...");
      const parseTable = (tabId) => {
        const rows = $(`${tabId} table tbody tr`);
        // Find the first row with a valid silver rate
        for (let i = 0; i < rows.length; i++) {
          const cells = $(rows[i]).find("td");
          if (cells.length === 7) {
            const silverRate = $(cells[6]).text().trim();
            if (silverRate) return silverRate;
          }
        }
        return null; // Return null if no valid rate found
      };

      silverAM = parseTable("#tab-am");
      silverPM = parseTable("#tab-pm");
    }

    if (!silverAM && !silverPM) {
      console.warn("No silver rates found via labels or history table.");
      return res
        .status(404)
        .json({ error: "Silver rates not available currently." });
    }

    const now = new Date();

    // Cache header
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate"); // 2 hours
    res.status(200).json({
      date: now.toISOString().split("T")[0],
      lblSilver999_AM: silverAM,
      lblSilver999_PM: silverPM || silverAM, // Fallback PM to AM if PM is missing
    });
  } catch (error) {
    console.error("Error scraping silver rates:", error.message);
    res.status(500).json({ error: "Failed to fetch silver rates" });
  }
};

// RSS feed handler for silver rates
const handleSilverRSSFeed = async (req, res) => {
  try {
    const monthFilter = getMonthFilter(req);

    // Get historical data for RSS feed
    const historicalData = await getHistoricalSilverData();

    if (
      !historicalData ||
      (historicalData.am.length === 0 && historicalData.pm.length === 0)
    ) {
      return res
        .status(404)
        .json({ error: "Silver rates not available for RSS feed" });
    }

    // Combine AM and PM data into RSS items
    let allItems = [];

    // Add AM data
    historicalData.am.forEach((item) => {
      if (item.silver_999) {
        allItems.push({
          title: `Silver Rates - ${item.date} (AM)`,
          description: `AM IBJA Silver Rates: 999: ₹${item.silver_999}`,
          date: item.date,
        });
      }
    });

    // Add PM data
    historicalData.pm.forEach((item) => {
      if (item.silver_999) {
        allItems.push({
          title: `Silver Rates - ${item.date} (PM)`,
          description: `PM IBJA Silver Rates: 999: ₹${item.silver_999}`,
          date: item.date,
        });
      }
    });

    // Apply month filter if provided
    const filteredItems = filterItemsByMonth(allItems, monthFilter);

    if (filteredItems.length === 0) {
      return res.status(404).json({
        error: monthFilter
          ? `No silver rate data available for ${monthFilter.monthString}`
          : "No silver rate data available",
        availableItems: allItems.length,
      });
    }

    const baseUrl = `${req.headers["x-forwarded-proto"] || "https"}://${
      req.headers.host
    }`;
    const rssContent = generateRSSFeed(
      "IBJA Silver Rates RSS Feed",
      "Historical and current silver rates from India Bullion and Jewellers Association (IBJA)",
      filteredItems,
      baseUrl,
      "/silver/latest"
    );

    res.setHeader("Content-Type", "application/rss+xml; charset=UTF-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).send(rssContent);
  } catch (error) {
    console.error("Error generating silver RSS feed:", error.message);
    res.status(500).json({ error: "Failed to generate RSS feed" });
  }
};

// Helper function to get current silver rates
const getCurrentSilverRates = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    let silverAM = $(`#lblSilver999_AM`).text().trim() || null;
    let silverPM = $(`#lblSilver999_PM`).text().trim() || null;

    // Fallback parsing if needed
    if (!silverAM && !silverPM) {
      const parseTable = (tabId) => {
        const rows = $(`${tabId} table tbody tr`);
        for (let i = 0; i < rows.length; i++) {
          const cells = $(rows[i]).find("td");
          if (cells.length === 7) {
            const silverRate = $(cells[6]).text().trim();
            if (silverRate) return silverRate;
          }
        }
        return null;
      };

      silverAM = parseTable("#tab-am");
      silverPM = parseTable("#tab-pm");
    }

    if (!silverAM && !silverPM) return null;

    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      lblSilver999_AM: silverAM,
      lblSilver999_PM: silverPM || silverAM,
    };
  } catch (error) {
    console.error("Error fetching current silver rates:", error.message);
    return null;
  }
};

// Helper function to get historical silver data
const getHistoricalSilverData = async () => {
  try {
    const { data } = await axios.get("https://www.ibjarates.com");
    const $ = cheerio.load(data);

    const parseTable = (tabId) => {
      const rows = $(`${tabId} table tbody tr`);
      const history = [];

      rows.each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length === 7) {
          const silver_999 = $(cells[6]).text().trim();
          const dateText = $(cells[0]).text().trim().replace(/\n/g, "");

          if (silver_999 && dateText) {
            history.push({
              date: dateText,
              silver_999: silver_999,
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
    console.error("Error fetching historical silver data:", error.message);
    return { am: [], pm: [] };
  }
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (urlPath === "/" || urlPath === "" || urlPath === "/silver") {
    // Root route for silver - no rate limit
    res.setHeader("Cache-Control", "s-maxage=7200, stale-while-revalidate");
    res.status(200).json({
      message: "Welcome to the IBJA Silver API",
      endpoint1: "/latest",
      endpoint2: "/latest/rss (RSS Feed with optional ?m=YYYY-MM filter)",
      description: "Fetches IBJA silver rates in India",
    });
    return;
  }

  if (urlPath.endsWith("/rss") && urlPath.includes("/latest")) {
    // RSS feed endpoint
    applyRateLimit(generalLimiter)(req, res, () =>
      handleSilverRSSFeed(req, res)
    );
    return;
  }

  // Assume any other path under /silver is /latest
  if (urlPath.includes("/latest") || urlPath === "/silver/latest") {
    applyRateLimit(generalLimiter)(req, res, () =>
      handleSilverRequest(req, res)
    );
    return;
  }

  // Fallback
  res.status(404).json({ error: "Endpoint not found" });
};
