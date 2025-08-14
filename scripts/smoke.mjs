// Simple local smoke test: ensure built index.html exists and basic strings present.
// Usage: node scripts/smoke.mjs
import fs from 'fs';
import path from 'path';

const dist = path.join(process.cwd(), 'dist');
const indexFile = path.join(dist, 'index.html');
if(!fs.existsSync(indexFile)) {
  console.error('Smoke FAIL: dist/index.html missing');
  process.exit(1);
}
const html = fs.readFileSync(indexFile,'utf8');
const required = ['<div id="root"'];
for(const marker of required) {
  if(!html.includes(marker)) {
    console.error('Smoke FAIL: missing marker', marker);
    process.exit(1);
  }
}
console.log('Smoke PASS');
