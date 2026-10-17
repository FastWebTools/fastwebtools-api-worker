import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import original from './status-service.mjs';
import entry from './status-entry.mjs';
const hashes={
'viewer-final.mjs':'e2fec1e871905ab7b4974260fd7ab125380b11b7a3013b3657365171e280039b',
'status-service.mjs':'9f4a0281d80372fcdbcefa410c2bba444d007f77e9885b5d2bccaaa2b97b6159',
'site.mjs':'32f609149af40a3a17aa3f771adf68c72688b949cbca28c880cbdfa34733dd00',
'site-legacy.mjs':'eda82eb2043e29c156f4244057c7a452751fd06bf88574d5a3ded2067272b29d',
'inventory.mjs':'04eb436b1b8442966d7a73d9c5ccf8aeee2342b4b34187436623792e2cc0c941',
'viewer-150.mjs':'14d42f638cb08233128795b8a984d7a8ac07c0399d9bdd3c28ba5e29999acf10',
'viewer-style-150.mjs':'d14106367ce1608b8a4308d29722bcc989abf96499f55ed814216561735281a5',
'build-150.mjs':'8e3f2b7466661f1bceb27da34ee612491a6111e1c2cf11ec324385287f76def7'};
for(const [file,expected] of Object.entries(hashes)) assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex'),expected,'Integrity '+file);
const pending=[];
globalThis.caches={default:{async match(){},async put(){},async delete(){return true}}};
const originalFetch=original.fetch.bind(original);
original.fetch=(request,env,ctx={waitUntil(p){pending.push(p)}})=>originalFetch(request,env,ctx);
await import('./api-test.mjs');
await Promise.all(pending);
await import('./test-140.mjs');
await import('./test-150.mjs');
const ctx={waitUntil(){}};
const root='https://release.invalid';
let response=await entry.fetch(new Request(root+'/status/'),{},ctx);
assert.equal(response.status,200);
assert.equal(response.headers.get('X-Status-Viewer-Version'),'1.5.0');
const html=await response.text();
const csp=response.headers.get('Content-Security-Policy');
assert(csp.includes("frame-ancestors 'none'"));
assert(html.includes('single-timeline-'));
assert(html.includes('data-show-tools'));
assert(html.includes('id="livebar"'));
assert.equal((html.match(/id="connection"/g)||[]).length,1);
assert(!html.includes('JSON Formatter: large inputs fail to format'));
const script=html.match(/<script[^>]*nonce="([^"]+)"[^>]*>([\s\S]*?)<\/script>/);
assert(script);
assert(csp.includes('nonce-'+script[1]));
new vm.Script(script[2]);
const headRequest=new Request(root+'/status/',{method:'HEAD'});
response=await entry.fetch(headRequest,{},ctx);
assert.equal(response.status,200);
assert.equal(response.headers.get('X-Status-Viewer-Version'),'1.5.0');
assert.equal(await response.text(),'');
response=await entry.fetch(new Request(root+'/status/api/admin/snapshot'),{},ctx);
assert.equal(response.status,401);
response=await entry.fetch(new Request(root+'/status/legacy'),{},ctx);
assert.equal(response.status,200);
assert(!(await response.text()).includes('id="livebar"'));
assert.equal(typeof entry.scheduled,'function');
console.log('RELEASE_150_INTEGRITY_API_ENTRY_CSP_HEAD_LEGACY_PASSED');
