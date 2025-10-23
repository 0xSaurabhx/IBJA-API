const axios = require('axios');
const cheerio = require('cheerio');
const { dataHeavyLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

// Core logic for fetching history
const handleHistoryRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const parseTable = (tabId) => {
      const rows = $(`${tabId} table tbody tr`);
      const history = [];

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 7) {
          // Add basic validation for rates
          const gold_999 = $(cells[1]).text().trim();
          const silver_999 = $(cells[6]).text().trim();
          if (gold_999 || silver_999) { // Only add if at least gold or silver has a value
             history.push({
               date: $(cells[0]).text().trim().replace(/\n/g, ''),
               gold_999: gold_999 || null,
               gold_995: $(cells[2]).text().trim() || null,
               gold_916: $(cells[3]).text().trim() || null,
               gold_750: $(cells[4]).text().trim() || null,
               gold_585: $(cells[5]).text().trim() || null,
               silver_999: silver_999 || null
             });
          }
        }
      });
      return history;
    };

    const am = parseTable('#tab-am');
    const pm = parseTable('#tab-pm');

    if (am.length === 0 && pm.length === 0) {
        console.warn('No historical data found in AM or PM tables.');
        return res.status(404).json({ error: 'Historical data not available currently.' });
    }

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours cache
    res.status(200).json({
      updated: new Date().toISOString(),
      am,
      pm
    });
  } catch (err) {
    console.error('History Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch historical rates' });
  }
};

// Apply middleware
module.exports = applyRateLimit(dataHeavyLimiter)(handleHistoryRequest);