export default async function handler(req, res) {
  // Set CORS headers for all incoming requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl || (!targetUrl.startsWith('https://technocore.chat/') && !targetUrl.startsWith('http://technocore.chat/'))) {
    return res.status(400).send('Invalid target URL');
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'TechnocoreStudio/1.0',
        'Accept': '*/*'
      }
    });

    const data = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
    
    res.setHeader('Content-Type', contentType);
    return res.status(upstream.status).send(data);
  } catch (err) {
    return res.status(502).send(`Proxy Error: ${err.message}`);
  }
}
