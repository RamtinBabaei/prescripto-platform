import { build } from 'esbuild';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const assets = {};
async function walk(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = dir + '/' + f.name;
    if (f.isDirectory()) {
      await walk(path);
      continue;
    }
    const bytes = await readFile(path);
    const ext = path.slice(path.lastIndexOf('.'));
    assets[path.slice(4)] = {
      body: gzipSync(bytes).toString('base64'),
      type: types[ext] || 'application/octet-stream',
      etag: '"' + createHash('sha256').update(bytes).digest('hex').slice(0, 16) + '"',
    };
  }
}
await walk('dist');
await mkdir('.deploy', { recursive: true });
await writeFile('.deploy/assets.json', JSON.stringify(assets));
await writeFile(
  '.deploy/entry.mjs',
  `import app from '../worker/index.ts';import assets from './assets.json';export default {async fetch(request,env,ctx){return app.fetch(request,{...env,ASSETS:{async fetch(r){const p=new URL(r.url).pathname;const file=assets[p]||(!p.includes('.')?assets['/index.html']:null);if(!file)return new Response('Not found',{status:404});const headers={'Content-Type':file.type,'Cache-Control':p==='/index.html'||!assets[p]?'no-cache':/\\/assets\\/.*-[a-zA-Z0-9_-]{6,}\\.(js|css)$/.test(p)?'public,max-age=31536000,immutable':'public,max-age=3600','ETag':file.etag,'Vary':'Accept-Encoding'};if(r.headers.get('if-none-match')===file.etag)return new Response(null,{status:304,headers});const bytes=Uint8Array.from(atob(file.body),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(r.method==='HEAD'?null:stream,{headers});}}},ctx);}};`,
);
await build({
  entryPoints: ['.deploy/entry.mjs'],
  outfile: '.deploy/worker.mjs',
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  external: ['node:crypto'],
});
console.log(
  'Self-contained Worker built with ' + Object.keys(assets).length + ' compressed assets.',
);
