const axios = require('axios');
const cheerio = require('cheerio');
const { dataHeavyLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

// Core logic for fetching chart data
const handleChartRequest = async (req, res) => {
  try {
    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const parseTableForChart = (tabId, session) => {
      const rows = $(`${tabId} table tbody tr`);
      const chartData = [];
      let parseError = false;

      rows.each((_, row) => {
        try {
            const cells = $(row).find('td');
            if (cells.length === 7) {
              const date = $(cells[0]).text().trim().replace(/\n/g, '');
              const gold999Text = $(cells[1]).text().trim().replace(/,/g, '');
              const gold916Text = $(cells[3]).text().trim().replace(/,/g, '');

              // Validate date format (simple check)
              if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
                  console.warn(`Skipping row with invalid date format: ${date}`);
                  return; // continue to next row
              }

              // Parse floats, handle potential errors
              const gold999 = parseFloat(gold999Text);
              const gold916 = parseFloat(gold916Text);

              // Only include entries with valid, positive rates
              if (!isNaN(gold999) && !isNaN(gold916) && gold999 > 0 && gold916 > 0) {
                const difference = gold999 - gold916;
                const ratio = (gold916 !== 0) ? (gold999 / gold916).toFixed(4) : "N/A";

                chartData.push({
                  date,
                  session,
                  gold_999: gold999,
                  gold_916: gold916,
                  difference: parseFloat(difference.toFixed(2)), // Ensure difference is also number
                  purity_ratio: ratio
                });
              } else {
                 // console.log(`Skipping row with invalid numbers: 999='${gold999Text}', 916='${gold916Text}'`);
              }
            }
        } catch (e) {
            console.error(`Error parsing row in ${tabId}: ${e.message}`);
            parseError = true;
            // Decide if you want to stop or continue parsing other rows
        }
      });

      if (parseError) {
          console.warn(`Partial data returned for ${session} due to parsing errors.`);
      }
      return chartData;
    };

    const amData = parseTableForChart('#tab-am', 'AM');
    const pmData = parseTableForChart('#tab-pm', 'PM');

    // Combine AM and PM data, sorting by date (most recent first)
    const combinedData = [...amData, ...pmData].sort((a, b) => {
      // Robust date parsing
      try {
        const datePartsA = a.date.split('/');
        const dateA = new Date(`${datePartsA[2]}-${datePartsA[1]}-${datePartsA[0]}`);
        const datePartsB = b.date.split('/');
        const dateB = new Date(`${datePartsB[2]}-${datePartsB[1]}-${datePartsB[0]}`);
        // Add checks for invalid dates if necessary
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; // Keep order if dates are invalid
        return dateB - dateA; // Sort descending (newest first)
      } catch (e) {
          console.error(`Date sorting error for ${a.date} or ${b.date}: ${e.message}`);
          return 0; // Keep original order on error
      }
    });

    if (combinedData.length === 0) {
        console.warn('No valid chart data could be parsed.');
        return res.status(404).json({ error: 'Chart data not available currently.' });
    }

    // Calculate statistics only on valid data points used in combinedData
    const validData = combinedData; // Already filtered during parsing
    const avg999 = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.gold_999, 0) / validData.length) : 0;
    const avg916 = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.gold_916, 0) / validData.length) : 0;
    const avgDifference = validData.length > 0 ? (validData.reduce((sum, item) => sum + item.difference, 0) / validData.length) : 0;

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours cache
    res.status(200).json({
      title: "Gold Purity Comparison (999 vs 916)",
      description: "Historical comparison between 999 and 916 gold purity rates",
      lastUpdated: new Date().toISOString(),
      statistics: {
        average_999: parseFloat(avg999.toFixed(2)),
        average_916: parseFloat(avg916.toFixed(2)),
        average_difference: parseFloat(avgDifference.toFixed(2)),
        total_records_parsed: amData.length + pmData.length, // More accurate name
        valid_records_combined: validData.length
      },
      data: combinedData, // Combined and sorted data
      // Keep AM/PM separate if needed, otherwise 'data' is usually sufficient
      // am: amData,
      // pm: pmData
    });
  } catch (err) {
    console.error('Chart Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

// Apply middleware
module.exports = applyRateLimit(dataHeavyLimiter)(handleChartRequest);