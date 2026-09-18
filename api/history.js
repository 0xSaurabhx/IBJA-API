const axios = require('axios');
const cheerio = require('cheerio');
const { dataHeavyLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

// Normalize a date string ("DD/MM/YYYY" or "YYYY-MM-DD") to ISO "YYYY-MM-DD".
// Returns null when the input is not a recognizable calendar date.
const toIsoDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : s;
  }
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(`${iso}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : iso;
  }
  return null;
};

// Core logic for fetching history
const handleHistoryRequest = async (req, res) => {
  try {
    // Validate optional filters before scraping (all backward-compatible:
    // omitted = unfiltered).
    //   ?date=YYYY-MM-DD (or DD/MM/YYYY) — single day
    //   ?from= & ?to= — inclusive ISO (or DD/MM/YYYY) range
    //   ?session=am|pm — return only that session's table
    const q = req.query || {};
    const singleIso = q.date ? toIsoDate(q.date) : null;
    const fromIso = q.from ? toIsoDate(q.from) : null;
    const toIso = q.to ? toIsoDate(q.to) : null;
    const session = q.session ? String(q.session).toLowerCase() : null;

    if ((q.date && !singleIso) || (q.from && !fromIso) || (q.to && !toIso)) {
      return res.status(400).json({
        error: 'Invalid date parameter. Use YYYY-MM-DD or DD/MM/YYYY.',
        usage: '/history?date=2026-09-15 or /history?from=2026-09-01&to=2026-09-15&session=pm'
      });
    }
    if (session && session !== 'am' && session !== 'pm') {
      return res.status(400).json({
        error: "Invalid session parameter. Use 'am' or 'pm'.",
        usage: '/history?session=am'
      });
    }

    const { data } = await axios.get('https://www.ibjarates.com');
    const $ = cheerio.load(data);

    const parseTable = (tabId) => {
      const rows = $(`${tabId} table tbody tr`);
      const history = [];

      // Column layout (IBJA added a Platinum column in ~2026, so rows now have
      // 8 cells instead of 7): date, 999, 995, 916, 750, 585, Silver 999, Platinum 999.
      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 7) {
          // Add basic validation for rates
          const gold_999 = $(cells[1]).text().trim();
          const silver_999 = $(cells[6]).text().trim();
          if (gold_999 || silver_999) { // Only add if at least gold or silver has a value
             const date = $(cells[0]).text().trim().replace(/\n/g, '');
             history.push({
               date,
               date_iso: toIsoDate(date),
               gold_999: gold_999 || null,
               gold_995: $(cells[2]).text().trim() || null,
               gold_916: $(cells[3]).text().trim() || null,
               gold_750: $(cells[4]).text().trim() || null,
               gold_585: $(cells[5]).text().trim() || null,
               silver_999: silver_999 || null,
               platinum_999: cells.length >= 8 ? ($(cells[7]).text().trim() || null) : null
             });
          }
        }
      });
      return history;
    };

    // Longer daily series from the hidden chart fields. The AM/PM tables only
    // cover the last few trading days, while HdnGold/HdnSilver hold ~4 months
    // of daily closes (PM session) used for the site's charts.
    const parseDailySeries = () => {
      const readHiddenJson = (id) => {
        const el = $(`input#${id}`);
        if (!el.length) return null;
        const raw = (el.attr('value') || '').replace(/&quot;/g, '"');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      };
      const gold = readHiddenJson('HdnGold');
      const silver = readHiddenJson('HdnSilver');
      if (!gold || !Array.isArray(gold.labels)) return [];
      const silverByLabel = {};
      if (silver && Array.isArray(silver.labels) && Array.isArray(silver.silverRate)) {
        silver.labels.forEach((label, i) => { silverByLabel[label] = silver.silverRate[i]; });
      }
      return gold.labels.map((label, i) => ({
        date: label,
        date_iso: toIsoDate(label),
        gold_999: gold.purity999?.[i] ?? null,
        gold_916: gold.purity916?.[i] ?? null,
        silver_999: silverByLabel[label] ?? null,
      }));
    };

    let am = parseTable('#tab-am');
    let pm = parseTable('#tab-pm');
    let daily = parseDailySeries();

    if (am.length === 0 && pm.length === 0 && daily.length === 0) {
        console.warn('No historical data found in AM or PM tables.');
        return res.status(404).json({ error: 'Historical data not available currently.' });
    }

    // Optional filters (validated above).

    const inRange = (row) => {
      const iso = row.date_iso;
      if (singleIso) return iso === singleIso;
      if (fromIso && iso && iso < fromIso) return false;
      if (toIso && iso && iso > toIso) return false;
      return true;
    };

    if (singleIso || fromIso || toIso) {
      am = am.filter(inRange);
      pm = pm.filter(inRange);
      daily = daily.filter(inRange);
    }
    if (session === 'am') pm = [];
    if (session === 'pm') am = [];

    // Cache header
    res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate'); // 2 hours cache
    res.status(200).json({
      updated: new Date().toISOString(),
      am,
      pm,
      daily
    });
  } catch (err) {
    console.error('History Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch historical rates' });
  }
};

// Apply middleware
module.exports = async (req, res) => {
  applyRateLimit(dataHeavyLimiter)(req, res, () => handleHistoryRequest(req, res));
};
