// Vercel entry point: every /api/* request is rewritten here (see vercel.json) and handed to the server in worker/.
import fs from 'node:fs';import path from 'node:path';
import worker from '../worker/index.js';

// Admin files (Apps Script and guide) are served only after the admin password, never as public static files.
const adminDir=path.join(process.cwd(),'admin-assets');
globalThis.ADMIN_ASSETS=Object.fromEntries(fs.readdirSync(adminDir).map(name=>[name,{type:'text/plain;charset=utf-8',data:fs.readFileSync(path.join(adminDir,name)).toString('base64url')}]));

const env={...process.env};
async function handle(request){
 const url=new URL(request.url),rewritten=url.searchParams.get('__path');
 if(rewritten!==null){
  url.pathname='/api/'+rewritten;url.searchParams.delete('__path');
  const body=['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer();
  request=new Request(url,{method:request.method,headers:request.headers,body});
 }
 return worker.fetch(request,env,{waitUntil(){}});
}
export const GET=handle,POST=handle,PUT=handle,PATCH=handle,DELETE=handle,OPTIONS=handle;
