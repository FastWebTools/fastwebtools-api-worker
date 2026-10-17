// Keep the approved frozen viewer; change display formatting only.
import './build-151.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url),marker='__VIEWER_NONCE__';
const {default:previous}=await import('./viewer-ready.mjs?build152');
let html=previous('',marker);
assert.equal((html.match(/minute:'2-digit'/g)||[]).length,2,'All viewer time formatters covered');
html=html.replaceAll("minute:'2-digit'","minute:'2-digit',hour12:true").replaceAll('new Intl.DateTimeFormat(undefined,','new Intl.DateTimeFormat(\'en-US\',');
assert(html.includes("document.body.dataset.viewerVersion='1.5.1'"));html=html.replace("document.body.dataset.viewerVersion='1.5.1'","document.body.dataset.viewerVersion='1.5.2'");
const script=html.match(/<script[^>]*>([\s\S]*?)<\/script>/);assert(script);new vm.Script(script[1]);
fs.writeFileSync(new URL('viewer-ready.mjs',root),'// Frozen browser document; all displayed dates use local 12-hour AM/PM.\nconst html='+JSON.stringify(html)+';\nexport default function viewer(_source,nonce){return html.replaceAll('+JSON.stringify(marker)+',nonce)}\n');
fs.writeFileSync(new URL('viewer.html',root),html.replaceAll(marker,'qatestnonce'));
let backend=fs.readFileSync(new URL('status-service-151.mjs',root),'utf8');assert(backend.includes("s.viewer_version='1.5.1'"));backend=backend.replace("s.viewer_version='1.5.1'","s.viewer_version='1.5.2'");fs.writeFileSync(new URL('status-service-152.mjs',root),backend);
console.log('TWELVE_HOUR_VIEWER_152_BUILT '+createHash('sha256').update(html).digest('hex'));
