import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)throw Error('Copy .env.example to .env and set ADMIN_EMAIL and ADMIN_PASSWORD before starting.');
const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid PORT');
await fs.mkdir('data',{recursive:true});const sqlite=new DatabaseSync('data/dev.sqlite');
sqlite.exec('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY NOT NULL)');
for(const name of (await fs.readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){
 if(sqlite.prepare('SELECT name FROM __local_migrations WHERE name=?').get(name))continue;
 sqlite.exec('BEGIN');try{sqlite.exec(await fs.readFile(path.join('drizzle',name),'utf8'));sqlite.prepare('INSERT INTO __local_migrations(name) VALUES(?)').run(name);sqlite.exec('COMMIT');}catch(err){sqlite.exec('ROLLBACK');throw err;}
}
const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return{success:true,meta:{changes:Number(r.changes)}};}};}};
const {default:worker}=await import('../dist/server/index.js');
const env={DB,ADMIN_EMAIL:process.env.ADMIN_EMAIL,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD,VAPID_PUBLIC_KEY:process.env.VAPID_PUBLIC_KEY,VAPID_PRIVATE_JWK:process.env.VAPID_PRIVATE_JWK,VAPID_SUBJECT:process.env.VAPID_SUBJECT};
const server=http.createServer(async(incoming,outgoing)=>{try{
 const chunks=[];for await(const chunk of incoming){chunks.push(chunk);if(chunks.reduce((n,b)=>n+b.length,0)>6000000){outgoing.writeHead(413).end();return;}}
 const url=new URL(incoming.url,`http://127.0.0.1:${port}`),headers=new Headers();for(const [key,value]of Object.entries(incoming.headers))if(value)headers.set(key,Array.isArray(value)?value.join(', '):value);
 // Development-only identity. This adapter is not included in the production Worker.
 // Never trust client-supplied identity headers in production.
 headers.set('oai-authenticated-user-id','local-doriano');headers.set('oai-authenticated-user-email',env.ADMIN_EMAIL);
 const request=new Request(url,{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await worker.fetch(request,env,{waitUntil(p){p.catch(()=>{});}});const responseHeaders=Object.fromEntries(response.headers);if(responseHeaders['set-cookie'])responseHeaders['set-cookie']=responseHeaders['set-cookie'].replace(/; Secure/g,'');outgoing.writeHead(response.status,responseHeaders);outgoing.end(Buffer.from(await response.arrayBuffer()));
}catch{outgoing.writeHead(500,{'Content-Type':'text/plain'}).end('Local development server error');}});
server.listen(port,'127.0.0.1',()=>console.log(`Clown Club local preview: http://127.0.0.1:${port}\nDevelopment identity: Doriano. Production authentication is not simulated outside this local server.`));
