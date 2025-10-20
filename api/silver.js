const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Handle root endpoint for /silver
  if (req.url === '/' || req.url === '' || req.url === '/silver') {
    // ✅ Root route response with cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Silver API',
      endpoint: '/latest',
      description: 'Fetches IBJA silver rates in India'
    });
    return;
  }

  // Handle any other request as latest endpoint
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const parseTable = (tabId) => {
      const rows = $(`${tabId} table tbody tr`);
      const history = [];

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 7) {
          history.push({
            date: $(cells[0]).text().trim().replace(/\n/g, ''),
            gold_999: $(cells[1]).text().trim(),
            gold_995: $(cells[2]).text().trim(),
            gold_916: $(cells[3]).text().trim(),
            gold_750: $(cells[4]).text().trim(),
            gold_585: $(cells[5]).text().trim(),
            silver_999: $(cells[6]).text().trim()
          });
        }
      });

      return history;
    };

    const am = parseTable('#tab-am');
    const pm = parseTable('#tab-pm');

    // Get the latest silver rates (first entry from AM and PM)
    const latestAM = am.length > 0 ? am[0] : null;
    const latestPM = pm.length > 0 ? pm[0] : null;

    const result = {};

    if (latestAM) {
      result.lblSilver999_AM = latestAM.silver_999;
    }

    if (latestPM) {
      result.lblSilver999_PM = latestPM.silver_999;
    }

    const now = new Date();

    // ✅ Add 2-hour cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      date: now.toISOString().split('T')[0],
      ...result
    });

  } catch (error) {
    console.error('Error scraping silver rates:', error.message);
    res.status(500).json({ error: 'Failed to fetch silver rates' });
  }
};