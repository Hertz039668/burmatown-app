import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('dist'); const cfg=JSON.parse(fs.readFileSync('perf-budget.json','utf8'));
if(!fs.existsSync(root)) { console.error('dist not found'); process.exit(1); }
const jsFiles=fs.readdirSync(root).filter(f=>f.endsWith('.js'));
let total=0, largest=0, largestName='';
for(const f of jsFiles){ const s=fs.statSync(path.join(root,f)).size; total+=s; if(s>largest){largest=s; largestName=f;} }
const kb=b=>Math.round(b/1024);
console.log(`[perf-budget] total=${kb(total)}KB largest=${largestName} ${kb(largest)}KB files=${jsFiles.length}`);
let fail=false; if(kb(total)>cfg.maxTotalJsKB){ console.error(`✖ Total JS exceeds budget (${kb(total)}KB > ${cfg.maxTotalJsKB}KB)`); fail=true; }
if(kb(largest)>cfg.maxEntryJsKB){ console.error(`✖ Entry chunk exceeds budget (${kb(largest)}KB > ${cfg.maxEntryJsKB}KB)`); fail=true; }
if(fail) process.exit(1); console.log('✔ Performance budget OK');
