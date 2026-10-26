// Small key-value store used by the server: Upstash Redis in production, memory in tests and local dev.
// Upstash is reached through its REST API, so no npm dependency is needed.
export function redisStore(url,token){
 async function call(...command){const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});const data=await r.json().catch(()=>({}));if(!r.ok||data.error)throw Error('Redis non disponibile');return data.result;}
 return{
  get:key=>call('GET',key),
  set:(key,value)=>call('SET',key,value),
  del:key=>call('DEL',key),
  async incr(key,ttlSeconds){const n=await call('INCR',key);if(n===1)await call('EXPIRE',key,ttlSeconds);return n;},
  hget:(hash,field)=>call('HGET',hash,field),
  hset:(hash,field,value)=>call('HSET',hash,field,value),
  hdel:(hash,field)=>call('HDEL',hash,field),
  async hgetall(hash){const flat=await call('HGETALL',hash)||[];const out={};for(let i=0;i<flat.length;i+=2)out[flat[i]]=flat[i+1];return out;}
 };
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
export function storeFor(env){
 if(env.STORE)return env.STORE;
 const url=env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL,token=env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)throw Error('Redis non configurato');
 return env.STORE=redisStore(url,token);
}
