// Minimal static server for Railway deployment
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = parseInt(process.env.PORT || '3000');
const DIST = join(import.meta.dirname, 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer((req, res) => {
  let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url!);

  // SPA fallback: if file doesn't exist, serve index.html
  if (!existsSync(filePath)) {
    filePath = join(DIST, 'index.html');
  }

  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`poeIdle server running on port ${PORT}`);
});
