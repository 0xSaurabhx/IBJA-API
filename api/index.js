const axios = require('axios');
const cheerio = require('cheerio');

const GOLD_IDS = [
  'lblGold999_AM',
  'lblGold995_AM',
  'lblGold916_AM',
  'lblGold750_AM',
  'lblGold585_AM',
  'lblGold585_PM',
  'lblGold750_PM',
  'lblGold916_PM',
  'lblGold995_PM',
  'lblGold999_PM'
];

module.exports = async (req, res) => {
  if (req.url === '/' || req.url === '') {
    // ✅ Root route response with cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
    res.status(200).json({
      message: 'Welcome to the IBJA Gold API',
      endpoint1: '/latest',
      endpoint2: '/history',
      endpoint3: '/silver',
      endpoint4: '/uptime',
      endpoint5: '/convert',
      endpoint6: '/platinum',
      description: 'Fetches IBJA gold rates in India'
    });
    return;
  }

  if (req.url.startsWith('/latest')) {
    try {
      const { data } = await axios.get('https://www.ibjarates.com');
      const $ = cheerio.load(data);

      const result = {};
      GOLD_IDS.forEach(id => {
        const text = $(`#${id}`).text().trim();
        result[id] = text || null;
      });

      const now = new Date();

      // ✅ Add 2-hour cache header
      res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate');
      res.status(200).json({
        date: now.toISOString().split('T')[0],
        ...result
      });

    } catch (error) {
      console.error('Error scraping:', error.message);
      res.status(500).json({ error: 'Failed to fetch gold rates' });
    }
    return;
  }

  // Fallback
  res.status(404).json({ error: 'Endpoint not found' });
};
