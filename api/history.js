const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
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

    res.setHeader('Cache-Control', 's-maxage=7200'); // 2 hours cache
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
