// Optional branch contract, owner-attested baseline, and persistent public revision time.
const OWNER_CONFIRMED_AT='2026-10-17T03:19:42.190Z';
const BRANCH_PHASES=['Reported','Investigating','Fix in progress','Testing','Resolved'];
function normalBranches(b){
 const extras={};if(b.buttons!==undefined){if(!Array.isArray(b.buttons)||b.buttons.length>2)fail('At most two notice buttons');extras.buttons=b.buttons.map(x=>{let u;try{u=new URL(x.url)}catch{fail('Invalid button URL')}if(u.protocol!=='https:'||u.username||u.password)fail('HTTPS button required');const label=text(x.label,60);if(!label)fail('Button label required');return {label,url:u.href}});}
 if(b.branches===undefined&&b.affected_tools===undefined)return extras;
 const ids=new Set([...INVENTORY.map(t=>t.id),'website','blog','api','invoice','comments']);
 let affected=b.affected_tools===undefined?(b.branches||[]).map(x=>x.tool_id):b.affected_tools;
 if(!Array.isArray(affected)||affected.length>51||new Set(affected).size!==affected.length||affected.some(id=>!ids.has(id)))fail('Invalid affected tools');
 const input=b.branches||[];if(!Array.isArray(input)||input.length>51||new Set(input.map(x=>x?.tool_id)).size!==input.length)fail('Invalid tool branches');
 let count=0;const branches=input.map(x=>{if(!x||!affected.includes(x.tool_id)||!BRANCH_PHASES.includes(x.state))fail('Invalid branch state or tool');const events=x.events||[];if(!Array.isArray(events)||events.length>40||(count+=events.length)>160)fail('Invalid branch timeline');return {tool_id:x.tool_id,state:x.state,summary:text(x.summary||'',1000),eta:date(x.eta),updated:date(x.updated),events:events.map(e=>{if(!BRANCH_PHASES.includes(e.stage))fail('Invalid branch phase');const at=date(e.at);if(!at||Date.parse(at)>Date.now()+60000)fail('Actual branch update time required');return {stage:e.stage,text:text(e.text||'',1000),at}})}});
 if(b.kind==='Resolved'&&branches.some(x=>x.state!=='Resolved'))fail('Resolve each tool branch before closing the incident',409);
 return {...extras,affected_tools:affected,branches};
}
async function enrichSnapshot(s,env,includeDraft){
 if(includeDraft)return s;
 for(const n of s.notices){
  // Compatibility for the existing explicitly named single-tool incident, without rewriting its saved record.
  if(n.id==='419c3058-78bc-47ae-a46b-a99ab9c6b85a'&&n.title==='Word Counter tool not working.'&&!n.branches?.length){n.affected_tools=['word-counter'];n.branches=[{tool_id:'word-counter',state:n.kind==='Resolved'?'Resolved':'Investigating',summary:n.progress||'',updated:n.updated,eta:n.eta,events:(n.events||[]).map(e=>({...e,stage:legacyPhase(e.stage)}))}];}
 }
 function attest(t){const newer=t.checked_at&&Date.parse(t.checked_at)>Date.parse(OWNER_CONFIRMED_AT);if(t.status==='Not verified'&&(!newer||t.source==='http'))return {...t,status:'Working',note:'',source:'owner-confirmed',checked_at:OWNER_CONFIRMED_AT};return {...t,note:/No administrator verification recorded|confirmation pending|does not verify|functional verification/i.test(t.note||'')?'':t.note};}
 s.tools=s.tools.map(attest);s.services=s.services.map(attest);
 for(const n of s.notices.filter(n=>['Bugs','Incidents'].includes(n.kind))){for(const b of n.branches||[]){if(b.state==='Resolved')continue;for(const t of [...s.tools,...s.services])if(t.id===b.tool_id){t.status='Issues';t.source='published-incident';t.note=b.summary||'';}}}
 for(const n of s.notices.filter(n=>n.kind==='Scheduled'&&n.start&&Date.parse(n.start)<=Date.now()&&(!n.end||Date.parse(n.end)>Date.now()))){for(const t of [...s.tools,...s.services])if((n.affected_tools||[]).includes(t.id)&&t.status!=='Issues')t.status='Maintenance';}
 const signature=JSON.stringify({tools:s.tools.map(t=>[t.id,t.status,t.note]),services:s.services.map(t=>[t.id,t.status,t.note]),notices:s.notices,settings:s.settings,owner_confirmed_at:OWNER_CONFIRMED_AT});
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature));const fingerprint=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
 let row=await env.STATUS_DB.prepare('SELECT payload FROM settings WHERE id=?').bind('viewer_state').first();let previous=row?JSON.parse(row.payload):null;
 if(previous?.fingerprint!==fingerprint){const payload=JSON.stringify({fingerprint,at:new Date().toISOString()});row=await env.STATUS_DB.prepare("INSERT INTO settings(id,payload,version,updated_by) VALUES(?,?,1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=settings.version+1,updated_by=excluded.updated_by WHERE json_extract(settings.payload,'$.fingerprint')<>? RETURNING payload").bind('viewer_state',payload,'viewer-system',fingerprint).first();previous=row?JSON.parse(row.payload):JSON.parse((await env.STATUS_DB.prepare('SELECT payload FROM settings WHERE id=?').bind('viewer_state').first()).payload);}
 s.last_updated=previous.at;s.viewer_version='1.4.0';s.owner_confirmed_at=OWNER_CONFIRMED_AT;return s;
}
function legacyPhase(s){s=String(s||'').toLowerCase();return /resolv|restor|normal|complete/.test(s)?'Resolved':/monitor|test|verif/.test(s)?'Testing':/fix|progress|apply|deploy|patch|work/.test(s)?'Fix in progress':/report|receiv/.test(s)?'Reported':'Investigating'}

function stampBranches(b,old){if(b.branches){const stable=({updated,...x})=>JSON.stringify(x);for(const branch of b.branches){const before=old?.branches?.find(x=>x.tool_id===branch.tool_id);branch.updated=before&&stable(before)===stable(branch)?before.updated:new Date().toISOString();}}return b;}
