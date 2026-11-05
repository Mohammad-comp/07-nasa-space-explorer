const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

const apiKey = process.env.NASA_API_KEY;
const port = Number(process.env.PORT || 3000);
const siteOrigin = process.env.SITE_ORIGIN;

if (!apiKey) {
  console.error('NASA_API_KEY is missing. Check your Codespaces secret and restart.');
  process.exit(1);
}

const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/js/dateRange.js', ['js/dateRange.js', 'text/javascript; charset=utf-8']],
  ['/js/script.js', ['js/script.js', 'text/javascript; charset=utf-8']],
  ['/img/nasa-worm-logo.png', ['img/nasa-worm-logo.png', 'image/png']],
]);

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

async function getApod(url, response) {
  if (siteOrigin) {
    response.setHeader('Access-Control-Allow-Origin', siteOrigin);
  }

  const start = url.searchParams.get('start_date');
  const end = url.searchParams.get('end_date');
  const today = new Date().toISOString().slice(0, 10);

  if (
    !isDate(start) ||
    !isDate(end) ||
    start < '1995-06-16' ||
    end > today ||
    start > end
  ) {
    return sendJson(response, 400, { error: 'Invalid date range.' });
  }

  const nasaUrl = new URL('https://api.nasa.gov/planetary/apod');
  nasaUrl.searchParams.set('api_key', apiKey);

  if (start === end) {
    nasaUrl.searchParams.set('date', start);
  } else {
    nasaUrl.searchParams.set('start_date', start);
    nasaUrl.searchParams.set('end_date', end);
  }

  try {
    const result = await fetch(nasaUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!result.ok) {
      console.error(`NASA APOD returned HTTP ${result.status}.`);
      const status = result.status === 429 ? 429 : 502;
      return sendJson(response, status, {
        error: 'NASA could not complete the request.',
      });
    }

    const entries = await result.json();
    return sendJson(response, 200, entries);
  } catch {
    return sendJson(response, 502, { error: 'Could not reach NASA.' });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (request.method !== 'GET') {
    return sendJson(response, 405, { error: 'Use GET.' });
  }

  if (url.pathname === '/api/apod') {
    return getApod(url, response);
  }

  const file = publicFiles.get(url.pathname);
  if (!file) return sendJson(response, 404, { error: 'File not found.' });

  try {
    const [path, contentType] = file;
    const contents = await readFile(join(__dirname, path));
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(contents);
  } catch {
    sendJson(response, 404, { error: 'File not found.' });
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Space Explorer is running on port ${port}.`);
});