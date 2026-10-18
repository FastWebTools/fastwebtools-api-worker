const message='The Status service has been disabled by the site owner.';
export default {
  async fetch(request){
    const u=new URL(request.url),headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Status-Service':'disabled','X-Content-Type-Options':'nosniff'};
    if(u.pathname.includes('/api/'))return new Response(request.method==='HEAD'?null:JSON.stringify({success:false,disabled:true,error:message}),{status:410,headers:{...headers,'Content-Type':'application/json;charset=utf-8'}});
    const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Status service disabled · Fast Web Tools</title></head><body><main><h1>Status service disabled</h1><p>'+message+'</p><p><a href="https://www.fastwebtools.online/">Visit Fast Web Tools</a></p></main></body></html>';
    return new Response(request.method==='HEAD'?null:html,{status:410,headers:{...headers,'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  },
  async scheduled(){}
};
