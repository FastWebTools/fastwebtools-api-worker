import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin='https://'+['www','fastwebtools','online'].join('.');
const admin='https://'+['admin','fastwebtools','online'].join('.');
const dev='https://'+['fastwebtools-status','formyworkupwork','workers','dev'].join('.');
for(const url of ['/status/','/status/legacy','/status/admin','/status/api/status','/status/api/admin/snapshot','/status/api/admin/editor-drafts','/status/api/auth/login'].map(p=>origin+p).concat(dev+'/')){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const t=await r.text();assert.equal(r.status,410,url);assert.equal(r.headers.get('x-status-service'),'disabled');assert(!t.includes('<script'));console.log('DISABLED_PASS',url,r.status);}
const a=await fetch(admin+'/',{signal:AbortSignal.timeout(30000)});const html=await a.text();assert.equal(a.status,200);assert(html.includes('FastWebTools'));assert(!html.includes('VB_STAGE1'));assert(!html.includes('ST_CONTENT'));console.log('ADMIN_HTML_PASS',createHash('sha256').update(html).digest('hex'));
const js=await fetch(admin+'/app.js',{signal:AbortSignal.timeout(30000)});const text=await js.text();assert.equal(js.status,200);assert.equal(createHash('sha256').update(text).digest('hex'),'be78b6f07314dcff640ffc607befe99b36b444b5e8dc523b5602fc9399a2e7b4');console.log('ORIGINAL_ADMIN_JS_PASS');
for(const url of [origin+'/','https://'+['fastwebtools-api','formyworkupwork','workers','dev'].join('.')+'/version']){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);await r.text();console.log('UNRELATED_ENDPOINT_PASS',url);}
console.log('STATUS_DISABLED_PUBLIC_VERIFICATION_PASS; production writes: 0; real login not attempted');
