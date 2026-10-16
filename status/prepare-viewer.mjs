import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const file=new URL('./viewer-final.mjs',import.meta.url);let s=fs.readFileSync(file,'utf8');const hash=v=>crypto.createHash('sha256').update(v).digest('hex');const expected='e2fec1e871905ab7b4974260fd7ab125380b11b7a3013b3657365171e280039b';
if(hash(s)!==expected){s=s.replace('LSaOF/N7/p//Ny','LSaOF/N7//p//Ny').replace('BrIUFH/1qg','BrIUFH//1qg').replace('WnABK/Pf/n8','WnABK/Pf//n8');assert.equal(hash(s),expected,'Viewer asset differs from browser-tested release; deployment blocked');fs.writeFileSync(file,s)}
console.log('VERIFIED_VIEWER_ASSET '+hash(s));
