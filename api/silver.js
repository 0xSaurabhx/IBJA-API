const axios = require('axios');
const cheerio = require('cheerio');
const { generalLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

// Core logic for fetching silver rates
const handleSilverRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
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
            const cells = $(rows[i]).find('td');
            if (cells.length === 7) {
              const silverRate = $(cells[6]).text().trim();
              if (silverRate) return silverRate;
            }
          }
          return null; // Return null if no valid rate found
        };

        silverAM = parseTable('#tab-am');
        silverPM = parseTable('#tab-pm');
    }

    if (!silverAM && !silverPM) {
        console.warn('No silver rates found via labels or history table.');
        return res.status(404).json({ error: 'Silver rates not available currently.' });
    }

    const now = new Date();

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours
    res.status(200).json({
      date: now.toISOString().split('T')[0],
      lblSilver999_AM: silverAM,
      lblSilver999_PM: silverPM || silverAM // Fallback PM to AM if PM is missing
    });

  } catch (error) {
    console.error('Error scraping silver rates:', error.message);
    res.status(500).json({ error: 'Failed to fetch silver rates' });
  }
};

// Main export - router and middleware application
module.exports = async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/' || urlPath === '' || urlPath === '/silver') {
    // Root route for silver - no rate limit
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Silver API',
      endpoint: '/latest',
      description: 'Fetches IBJA silver rates in India'
    });
    return;
  }

  // Assume any other path under /silver is /latest
  if (urlPath.includes('/latest') || urlPath === '/silver/latest') {
     applyRateLimit(generalLimiter)(req, res, () => handleSilverRequest(req, res));
     return;
  }

  // Fallback
  res.status(404).json({ error: 'Endpoint not found' });
};