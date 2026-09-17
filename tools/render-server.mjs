import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.env.RENDER_PORT || 8765);
const origin = `http://${host}:${port}`;
await mkdir(resolve(root, '.render/frames'), { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (req.headers.host !== `${host}:${port}`) { res.writeHead(403).end(); return; }
    if (req.method === 'POST') {
      if (req.headers.origin !== origin || !/^\/frame\/\d{4}$/.test(url.pathname)) { res.writeHead(403).end(); return; }
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 8 * 1024 * 1024) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const png = Buffer.concat(chunks);
      if (!png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) { res.writeHead(415).end(); return; }
      await writeFile(resolve(root, `.render/frames/${url.pathname.slice(7)}.png`), png);
      res.writeHead(204).end(); return;
    }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const pathname = url.pathname === '/' ? '/tools/render.html' : decodeURIComponent(url.pathname);
    // Only serve the renderer, its scene bundle, and finished public assets.
    if (!/^\/(tools\/|assets\/|\.render\/workstation3d\.js$)/.test(pathname) || pathname.includes('..')) { res.writeHead(403).end(); return; }
    const file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch (error) {
    if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end('Unable to serve this file.');
  }
}).listen(port, host, () => console.log(`Profile renderer: ${origin}`));
