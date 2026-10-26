import http from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import {memoryStore} from '../worker/store.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
if(!process.env.CLUB_PASSWORD||!process.env.ADMIN_PASSWORD)throw Error('Copy .env.example to .env and set CLUB_PASSWORD and ADMIN_PASSWORD before starting.');
const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid PORT');
const {default:worker}=await import('../dist/server/index.js');
// Uses Upstash if its variables are in .env, otherwise an in-memory store that resets on restart.
const useRedis=!!(process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL);
const env={...process.env,...(useRedis?{}:{STORE:memoryStore()})};
const server=http.createServer(async(incoming,outgoing)=>{try{
 const chunks=[];for await(const chunk of incoming){chunks.push(chunk);if(chunks.reduce((n,b)=>n+b.length,0)>6000000){outgoing.writeHead(413).end();return;}}
 const url=new URL(incoming.url,`http://${incoming.headers.host||'127.0.0.1:'+port}`),headers=new Headers();for(const [key,value]of Object.entries(incoming.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
 const request=new Request(url,{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await worker.fetch(request,env,{waitUntil(p){p.catch(()=>{});}});outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
}catch{outgoing.writeHead(500,{'Content-Type':'text/plain'}).end('Local development server error');}});
server.listen(port,'127.0.0.1',()=>console.log(`Clown Club local preview: http://127.0.0.1:${port}\nStore: ${useRedis?'Upstash Redis':'memory (resets on restart)'}`));
