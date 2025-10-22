const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Handle root endpoint for /platinum
  if (req.url === '/' || req.url === '' || req.url === '/platinum') {
    // ✅ Root route response with cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Platinum API',
      endpoint: '/latest',
      description: 'Fetches IBJA platinum rates in India'
    });
    return;
  }

  // Handle any other request as latest endpoint
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    // Find platinum rate from table structure
    let platinumRate = null;
    $('tr').filter((i, elem) => {
      return $(elem).text().toLowerCase().includes('platinum');
    }).each((i, elem) => {
      const cells = $(elem).find('td');
      if (cells.length >= 3) {
        const rateText = $(cells[2]).text().trim();
        if (rateText && /^\d+$/.test(rateText.replace(/,/g, ''))) {
          platinumRate = rateText;
        }
      }
    });

    const now = new Date();

    // ✅ Add 2-hour cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      date: now.toISOString().split('T')[0],
      lblPlatinum999_AM: platinumRate,
      lblPlatinum999_PM: platinumRate // Same rate for both sessions
    });

  } catch (error) {
    console.error('Error scraping platinum rates:', error.message);
    res.status(500).json({ error: 'Failed to fetch platinum rates' });
  }
};