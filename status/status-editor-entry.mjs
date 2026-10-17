import base from'./status-entry.mjs';import{editor}from'./editor-service.mjs';export default{scheduled:base.scheduled,async fetch(req,env,ctx){return await editor(req,env)||base.fetch(req,env,ctx)}};
