module.exports = async (req, res) => {
  const now = new Date();

  // ✅ Add cache header (shorter cache for uptime)
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json({
    status: 'ok',
    timestamp: now.toISOString(),
    uptime: process.uptime(),
    message: 'IBJA API is running'
  });
};