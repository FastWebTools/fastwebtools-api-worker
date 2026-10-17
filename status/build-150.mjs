import './build-140.mjs';
import fs from'node:fs';
const root=new URL('./',import.meta.url);let s=fs.readFileSync(new URL('status-service-140.mjs',root),'utf8');
const old='function normalNotice(b){const branchFields=normalBranches(b);';
if(!s.includes(old))throw Error('Single issue backend patch mismatch');
s=s.replace(old,"function normalNotice(b){if(b.branches!==undefined&&(!Array.isArray(b.branches)||b.branches.some(x=>!x||typeof x!=='object')))fail('Invalid incident timeline');const branchFields=normalBranches(b);if(['Bugs','Incidents','Resolved'].includes(b.kind)&&((branchFields.branches?.length||0)>1||(branchFields.affected_tools?.length||0)>1))fail('One issue and one affected tool per incident');");
s=s.replace("s.viewer_version='1.4.0'","s.viewer_version='1.5.0'");fs.writeFileSync(new URL('status-service-150.mjs',root),s);console.log('SINGLE_ISSUE_BACKEND_BUILT');
