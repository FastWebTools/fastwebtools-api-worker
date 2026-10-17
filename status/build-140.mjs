import fs from 'node:fs';
const root=new URL('./',import.meta.url);let s=fs.readFileSync(new URL('status-service.mjs',root),'utf8');const replace=(a,b)=>{if(!s.includes(a))throw Error('Backend patch mismatch '+a);s=s.replace(a,b)};
replace('function normalNotice(b){','function normalNotice(b){const branchFields=normalBranches(b);');
replace('pinned:b.pinned===true,events:e,date:date(b.date)','pinned:b.pinned===true,events:e,...branchFields,date:date(b.date)');
replace('return {success:true,version:VERSION,server_time:', 'return await enrichSnapshot({success:true,version:VERSION,server_time:');
replace("monitoring_scope:'HTTP availability only. Tool functionality and uptime before monitoring started are not inferred.'}}", "monitoring_scope:'HTTP availability only. Tool functionality and uptime before monitoring started are not inferred.'},env,includeDraft)}");
replace("if(!b.date&&b.visibility==='published')b.date=now;const saved=", "stampBranches(b);if(!b.date&&b.visibility==='published')b.date=now;const saved=");
replace("const input=await body(req),b=normalNotice(input),now=new Date().toISOString();if(!Number.isInteger(input.version)","const input=await body(req);const previous=await env.STATUS_DB.prepare('SELECT payload FROM notices WHERE id=?').bind(match[1]).first();const old=previous?JSON.parse(previous.payload):null;if(old){for(const field of ['branches','affected_tools','buttons'])if(input[field]===undefined&&old[field]!==undefined)input[field]=old[field];}const b=normalNotice(input);stampBranches(b,old);const now=new Date().toISOString();if(!Number.isInteger(input.version)");
s+='\n'+fs.readFileSync(new URL('branch-support.mjs',root),'utf8');fs.writeFileSync(new URL('status-service-140.mjs',root),s);console.log('VIEWER_BRANCH_BACKEND_BUILT');
