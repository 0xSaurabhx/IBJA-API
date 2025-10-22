const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const parseTableForChart = (tabId, session) => {
      const rows = $(`${tabId} table tbody tr`);
      const chartData = [];

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length === 7) {
          const date = $(cells[0]).text().trim().replace(/\n/g, '');
          const gold999 = $(cells[1]).text().trim();
          const gold916 = $(cells[3]).text().trim();

          // Only include entries with valid rates
          if (gold999 && gold916 && date) {
            chartData.push({
              date,
              session,
              gold_999: parseFloat(gold999.replace(/,/g, '')) || 0,
              gold_916: parseFloat(gold916.replace(/,/g, '')) || 0,
              difference: (parseFloat(gold999.replace(/,/g, '')) || 0) - (parseFloat(gold916.replace(/,/g, '')) || 0),
              purity_ratio: ((parseFloat(gold999.replace(/,/g, '')) || 0) / (parseFloat(gold916.replace(/,/g, '')) || 0)).toFixed(4)
            });
          }
        }
      });

      return chartData;
    };

    const amData = parseTableForChart('#tab-am', 'AM');
    const pmData = parseTableForChart('#tab-pm', 'PM');

    // Combine AM and PM data, sorting by date (most recent first)
    const combinedData = [...amData, ...pmData].sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB - dateA;
    });

    // Calculate statistics
    const validData = combinedData.filter(item => item.gold_999 > 0 && item.gold_916 > 0);
    const avg999 = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.gold_999, 0) / validData.length).toFixed(2) : 0;
    const avg916 = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.gold_916, 0) / validData.length).toFixed(2) : 0;
    const avgDifference = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.difference, 0) / validData.length).toFixed(2) : 0;

    res.setHeader('Cache-Control', 's-maxage=7200'); // 2 hours cache
    res.status(200).json({
      title: "Gold Purity Comparison (999 vs 916)",
      description: "Historical comparison between 999 and 916 gold purity rates",
      lastUpdated: new Date().toISOString(),
      statistics: {
        average_999: parseFloat(avg999),
        average_916: parseFloat(avg916),
        average_difference: parseFloat(avgDifference),
        total_records: combinedData.length,
        valid_records: validData.length
      },
      data: combinedData,
      am: amData,
      pm: pmData
    });
  } catch (err) {
    console.error('Chart Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};