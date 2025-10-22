const axios = require('axios');
const { utilityLimiter, applyRateLimit } = require('./_rateLimiter'); // Import rate limiter

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/INR';

// Cache exchange rates for 1 hour
let exchangeRates = null;
let ratesLastUpdated = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getExchangeRates() {
  const now = Date.now();
  // Check cache validity
  if (!exchangeRates || !ratesLastUpdated || (now - ratesLastUpdated > CACHE_DURATION)) {
    try {
      console.log('Fetching fresh exchange rates...');
      const response = await axios.get(EXCHANGE_RATE_API);
      if (response.data && response.data.rates) {
          exchangeRates = response.data.rates;
          ratesLastUpdated = now; // Update timestamp only on success
          console.log('Exchange rates updated successfully:', new Date(ratesLastUpdated).toISOString());
      } else {
          console.error('Invalid response structure from exchange rate API:', response.data);
          if (!exchangeRates) { // Only throw if cache is also empty
              throw new Error('Invalid response from exchange rate API');
          } else {
             console.warn('Using stale exchange rates due to API fetch error.');
          }
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      // Use stale cache if available, otherwise throw
      if (!exchangeRates) {
        throw new Error('Unable to fetch exchange rates and no cache available');
      } else {
         console.warn('Using stale exchange rates due to API fetch error.');
      }
    }
  } else {
     // console.log("Using cached exchange rates.");
  }
  return exchangeRates;
}

// Core logic for conversion
const handleConvertRequest = async (req, res) => {
  try {
    // Robust URL parsing needed for Vercel environment
    const base = `http://${req.headers.host}`;
    const url = new URL(req.url, base);
    const from = (url.searchParams.get('from') || 'INR').toUpperCase(); // Normalize case
    const to = url.searchParams.get('to')?.toUpperCase(); // Normalize case
    const amount = parseFloat(url.searchParams.get('amount')) || 1;

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount parameter. Must be a positive number.' });
    }

    if (!to) {
      return res.status(400).json({
        error: 'Missing required parameter: to',
        usage: '/convert?from=INR&to=USD&amount=1000'
      });
    }

    const rates = await getExchangeRates(); // This might throw if fetch fails and cache is empty

    // Check if currencies exist in the rates object
    if (!(from in rates)) {
      return res.status(400).json({
        error: `Unsupported 'from' currency: ${from}`,
        supported_example: Object.keys(rates).slice(0, 10) // Show some examples
      });
    }
     if (!(to in rates)) {
      return res.status(400).json({
        error: `Unsupported 'to' currency: ${to}`,
        supported_example: Object.keys(rates).slice(0, 10)
      });
    }

    // Perform conversion: Amount in base (INR) * Target Rate / Source Rate
    // Since our base is INR: (amount / rates[from]) * rates[to]
    const rateFromBase = rates[from]; // Rate of 1 INR to 'from' currency (will be 1 if from=INR)
    const rateToBase = rates[to]; // Rate of 1 INR to 'to' currency

    // Correct calculation: Convert 'amount' from 'from' currency to base (INR), then to 'to' currency.
    const amountInBase = amount / rateFromBase;
    const convertedAmount = amountInBase * rateToBase;

    // Calculate the direct rate from 'from' to 'to'
    const directRate = rateToBase / rateFromBase;


    // Cache header
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour
    res.status(200).json({
      from,
      to,
      amount,
      convertedAmount: parseFloat(convertedAmount.toFixed(6)), // More precision for rates
      rate: parseFloat(directRate.toFixed(6)),
      lastUpdated: ratesLastUpdated ? new Date(ratesLastUpdated).toISOString() : null
    });

  } catch (error) {
    console.error('Currency conversion error:', error.message);
    // Distinguish between fetch errors and other errors
    if (error.message.includes('exchange rates')) {
        res.status(503).json({ error: 'Service Unavailable: Could not fetch exchange rates.' });
    } else {
        res.status(500).json({ error: 'Internal Server Error during currency conversion.' });
    }
  }
};

// Apply middleware
module.exports = applyRateLimit(utilityLimiter)(handleConvertRequest);