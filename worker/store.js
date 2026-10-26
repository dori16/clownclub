// Small key-value store used by the server. Production: Upstash (REST) or any Redis (REDIS_URL, TCP).
// Tests and local dev: memory. No npm dependencies.
function commands(call){
 return{
  get:key=>call('GET',key),
  set:(key,value)=>call('SET',key,String(value)),
  del:key=>call('DEL',key),
  async incr(key,ttlSeconds){const n=Number(await call('INCR',key));if(n===1)await call('EXPIRE',key,String(ttlSeconds));return n;},
  hget:(hash,field)=>call('HGET',hash,field),
  hset:(hash,field,value)=>call('HSET',hash,field,String(value)),
  hdel:(hash,field)=>call('HDEL',hash,field),
  async hgetall(hash){const flat=await call('HGETALL',hash)||[];const out={};for(let i=0;i<flat.length;i+=2)out[flat[i]]=flat[i+1];return out;}
 };
}
export function redisStore(url,token){
 return commands(async(...command)=>{let r;try{r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});}catch{throw Error('Redis non raggiungibile: controlla l’URL REST di Upstash');}const data=await r.json().catch(()=>({}));if(r.status===401)throw Error('Redis rifiuta il token: controlla il token REST di Upstash');if(!r.ok||data.error)throw Error('Redis: '+(data.error||'errore '+r.status));return data.result;});
}
// Minimal RESP client over TCP/TLS, for providers that only give a redis:// or rediss:// URL.
export function tcpRedisStore(redisUrl){
 const u=new URL(redisUrl);let conn=null;
 const encode=args=>'*'+args.length+'\r\n'+args.map(a=>{const s=String(a);return '$'+Buffer.byteLength(s)+'\r\n'+s+'\r\n';}).join('');
 function parse(buf,pos){
  const end=buf.indexOf('\r\n',pos);if(end<0)return null;const type=String.fromCharCode(buf[pos]),line=buf.toString('utf8',pos+1,end);let next=end+2;
  if(type==='+')return [line,next];if(type==='-')return [Object.assign(Error('Redis: '+line),{redis:true}),next];if(type===':')return [Number(line),next];
  if(type==='$'){const len=Number(line);if(len<0)return [null,next];if(buf.length<next+len+2)return null;return [buf.toString('utf8',next,next+len),next+len+2];}
  if(type==='*'){const n=Number(line);if(n<0)return [null,next];const out=[];for(let i=0;i<n;i++){const r=parse(buf,next);if(!r)return null;out.push(r[0]);next=r[1];}return [out,next];}
  throw Error('Risposta Redis non valida');
 }
 async function connect(){
  const net=await import('node:net'),tls=await import('node:tls');
  const socket=u.protocol==='rediss:'?tls.connect({host:u.hostname,port:Number(u.port||6379),servername:u.hostname}):net.connect({host:u.hostname,port:Number(u.port||6379)});
  const c={socket,buf:Buffer.alloc(0),queue:[],dead:false};
  const fail=err=>{c.dead=true;for(const q of c.queue.splice(0))q.reject(err);if(conn===c)conn=null;};
  socket.setTimeout(10000,()=>{socket.destroy();fail(Error('Redis non risponde'));});
  socket.on('data',chunk=>{c.buf=Buffer.concat([c.buf,chunk]);let r;while(c.queue.length&&(r=parse(c.buf,0))){c.buf=c.buf.subarray(r[1]);const q=c.queue.shift();r[0] instanceof Error?q.reject(r[0]):q.resolve(r[0]);}});
  socket.on('error',()=>fail(Error('Redis non raggiungibile: controlla REDIS_URL')));socket.on('close',()=>fail(Error('Connessione Redis chiusa')));
  c.send=args=>new Promise((resolve,reject)=>{if(c.dead)return reject(Error('Connessione Redis chiusa'));c.queue.push({resolve,reject});socket.write(encode(args));});
  const user=decodeURIComponent(u.username||''),pass=decodeURIComponent(u.password||'');
  if(pass)await c.send(user&&user!=='default'?['AUTH',user,pass]:['AUTH',pass]);
  const db=u.pathname.slice(1);if(db)await c.send(['SELECT',db]);
  return c;
 }
 return commands(async(...args)=>{if(!conn||conn.dead)conn=connect();const c=await conn.catch(err=>{conn=null;throw err;});return c.send(args);});
}
export function memoryStore(initial={}){
 const data=new Map(Object.entries(initial)),expires=new Map();
 const live=key=>{if(expires.has(key)&&expires.get(key)<Date.now()){data.delete(key);expires.delete(key);}return data.get(key);};
 const hash=name=>{let h=live(name);if(!h){h={};data.set(name,h);}return h;};
 return{
  data,
  async get(key){return live(key)??null;},
  async set(key,value){data.set(key,value);},
  async del(key){data.delete(key);expires.delete(key);},
  async incr(key,ttlSeconds){const n=Number(live(key)||0)+1;data.set(key,n);if(n===1)expires.set(key,Date.now()+ttlSeconds*1000);return n;},
  async hget(name,field){return live(name)?.[field]??null;},
  async hset(name,field,value){hash(name)[field]=value;},
  async hdel(name,field){delete hash(name)[field];},
  async hgetall(name){return {...(live(name)||{})};}
 };
}
// Finds the Redis variables whatever prefix the Vercel integration used (KV_, UPSTASH_REDIS_, STORAGE_…).
export function redisConfig(env){
 const keys=Object.keys(env),value=k=>k&&String(env[k]||'').trim();
 const restUrl=['KV_REST_API_URL','UPSTASH_REDIS_REST_URL'].find(k=>value(k))||keys.find(k=>/(REST_API_URL|REDIS_REST_URL|REST_URL)$/.test(k)&&value(k));
 if(restUrl){const tokenKey=[restUrl.replace(/URL$/,'TOKEN'),'KV_REST_API_TOKEN','UPSTASH_REDIS_REST_TOKEN'].find(k=>value(k)&&!/READ_ONLY/.test(k));if(tokenKey)return {kind:'rest',url:value(restUrl),token:value(tokenKey)};}
 const tcp=['REDIS_URL','KV_URL'].find(k=>/^rediss?:\/\//.test(value(k)||''))||keys.find(k=>/(REDIS_URL|KV_URL)$/.test(k)&&/^rediss?:\/\//.test(value(k)||''));
 if(tcp)return {kind:'tcp',url:value(tcp)};
 return null;
}
export function storeFor(env){
 if(env.STORE)return env.STORE;
 const config=redisConfig(env);
 if(!config)throw Error('Redis non configurato: collega Upstash Redis al progetto Vercel e rifai il deploy');
 return env.STORE=config.kind==='rest'?redisStore(config.url,config.token):tcpRedisStore(config.url);
}
