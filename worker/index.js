import {url64,from64,allowedPushEndpoint,sendPush} from './push.js';
const textEncoder=new TextEncoder();
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function digest(value){return url64(await crypto.subtle.digest('SHA-256',textEncoder.encode(value)));}
const cookie=request=>(request.headers.get('Cookie')||'').match(/(?:^|;\s*)cc-admin=([^;]+)/)?.[1];
function visitor(request){return request.headers.get('oai-authenticated-user-id');}
async function config(env,key){return (await env.DB.prepare('SELECT value FROM cc_config WHERE key = ?').bind(key).first())?.value||null;}
async function putConfig(env,key,value){return env.DB.prepare('INSERT INTO cc_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
async function owner(request,env){const id=visitor(request);if(!id||(request.headers.get('oai-authenticated-user-email')||'').toLowerCase()!==env.ADMIN_EMAIL?.toLowerCase())return false;const bound=await config(env,'owner_id');return !bound||bound===id;}
async function admin(request,env){if(!await owner(request,env))return false;const c=cookie(request);if(!c)return false;return !!await env.DB.prepare('SELECT hash FROM cc_sessions WHERE hash=? AND user_id=? AND expires>?').bind(await digest(c),visitor(request),Date.now()).first();}
async function body(request){const raw=await request.text();if(raw.length>6000000)throw Error('Richiesta troppo grande');return JSON.parse(raw||'{}');}
async function rate(env,key,max=10,window=600000){const bucket=Math.floor(Date.now()/window),result=await env.DB.prepare('INSERT INTO cc_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN bucket=excluded.bucket THEN count+1 ELSE 1 END,bucket=excluded.bucket RETURNING count').bind(key,bucket).first();return result.count<=max;}
function safeSheetUrl(s){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(s);}
export default {async fetch(request,env,ctx){try{const u=new URL(request.url),path=u.pathname;
  if(!path.startsWith('/api/')){const a=typeof ASSETS!=='undefined'?ASSETS:{};const asset=a[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(from64(asset.data),{headers:{'Content-Type':asset.type,'Cache-Control':path==='/sw.js'?'no-cache':'public,max-age=0,must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...(path==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})}});}
  if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==u.origin)return json({error:'Origine non autorizzata'},403);
  if(!visitor(request))return json({error:'Accedi al sito con ChatGPT'},401);
  if(path==='/api/whoami')return json({isDoriano:await owner(request,env)});
  if(path==='/api/club/status')return json({connected:!!await config(env,'sheets'),pushReady:!!env.VAPID_PUBLIC_KEY});
  if(path==='/api/admin/login'&&request.method==='POST'){
    if(!await owner(request,env))return json({error:'Area riservata a Doriano'},403);
    if(!await rate(env,'login:'+visitor(request)+':'+(request.headers.get('CF-Connecting-IP')||''),5))return json({error:'Troppi tentativi. Riprova tra qualche minuto.'},429);
    const d=await body(request);if(!env.ADMIN_PASSWORD||await digest(String(d.password))!==await digest(env.ADMIN_PASSWORD))return json({error:'Password errata'},401);
    await putConfig(env,'owner_id',visitor(request));const token=url64(crypto.getRandomValues(new Uint8Array(32)));await env.DB.prepare('DELETE FROM cc_sessions WHERE expires < ?').bind(Date.now()).run();await env.DB.prepare('INSERT INTO cc_sessions(hash,user_id,expires) VALUES(?,?,?)').bind(await digest(token),visitor(request),Date.now()+86400000).run();return json({ok:true},200,{'Set-Cookie':`cc-admin=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`});
  }
  if(path.startsWith('/api/admin/')){
    if(!await admin(request,env))return json({error:'Sblocca l’area Doriano con la password'},403);
    if(path==='/api/admin/session')return json({ok:true});
    if(path==='/api/admin/logout'&&request.method==='POST'){const c=cookie(request);if(c)await env.DB.prepare('DELETE FROM cc_sessions WHERE hash=?').bind(await digest(c)).run();return json({ok:true},200,{'Set-Cookie':'cc-admin=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});}
    if(path==='/api/admin/script'||path==='/api/admin/guide'){const filename=path.endsWith('script')?'Google-Sheets.gs':'GUIDA.md',entry=typeof ADMIN_ASSETS!=='undefined'?ADMIN_ASSETS[filename]:null;if(!entry)return json({error:'File non disponibile'},404);return new Response(from64(entry.data),{headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${filename}"`}});}
    if(path==='/api/admin/sheets'){
      const saved=JSON.parse(await config(env,'sheets')||'null');
      if(request.method==='GET')return json({url:saved?.url||'',hasToken:!!saved?.token});
      const d=await body(request);if(request.method==='DELETE'){await env.DB.prepare('DELETE FROM cc_config WHERE key=?').bind('sheets').run();return json({ok:true});}
      if(!safeSheetUrl(d.url)||!(d.token||saved?.token)||String(d.token||saved?.token).length<24)return json({error:'URL o token non valido'},400);await putConfig(env,'sheets',JSON.stringify({url:d.url,token:d.token||saved.token}));return json({ok:true});
    }
    if(path==='/api/admin/subscribers'){const {results}=await env.DB.prepare('SELECT member_name,created,updated FROM cc_push ORDER BY updated DESC').all();return json({devices:results});}
    if(path==='/api/admin/push'&&request.method==='POST'){
      const d=await body(request),title=String(d.title||'').trim(),message=String(d.body||'').trim();if(!title||!message||title.length>80||message.length>500)return json({error:'Inserisci titolo (max 80) e messaggio (max 500)'},400);
      if(!await rate(env,'broadcast',30,3600000))return json({error:'Troppi invii ravvicinati'},429);
      const {results}=await env.DB.prepare('SELECT id,subscription FROM cc_push').all();if(!results.length)return json({error:'Nessun dispositivo ha attivato le notifiche'},400);
      const report={total:results.length,accepted:0,expired:0,failed:0};const payload={title,body:message,url:'/',tag:'clown-'+crypto.randomUUID()};
      for(let i=0;i<results.length;i+=8){await Promise.all(results.slice(i,i+8).map(async row=>{try{const r=await sendPush(JSON.parse(row.subscription),payload,env);if(r.ok)report.accepted++;else if(r.status===404||r.status===410){report.expired++;await env.DB.prepare('DELETE FROM cc_push WHERE id=?').bind(row.id).run();}else report.failed++;}catch{report.failed++;}}));}return json(report);
    }
    return json({error:'Operazione non disponibile'},404);
  }
  if(path==='/api/sync'){
    const settings=JSON.parse(await config(env,'sheets')||'null');if(!settings)return json({ok:false,error:'Il foglio non è ancora collegato da Doriano'},409);const target=new URL(settings.url);let opts={redirect:'follow',signal:AbortSignal.timeout(25000)};
    if(request.method==='GET'){target.searchParams.set('token',settings.token);target.searchParams.set('t',Date.now());}else if(request.method==='POST'){const d=await body(request);opts={...opts,method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:settings.token,expectedRevision:d.expectedRevision,envelope:d.envelope})};}else return json({error:'Metodo non supportato'},405);
    const r=await fetch(target,opts);if(!r.ok)return json({ok:false,error:'Google Sheets non risponde'},502);return json(await r.json());
  }
  if(path==='/api/push/key')return json({publicKey:env.VAPID_PUBLIC_KEY});
  if(path==='/api/push/subscribe'&&request.method==='POST'){
    if(!await rate(env,'subscribe:'+visitor(request),50,3600000))return json({error:'Troppi dispositivi registrati in poco tempo'},429);
    const d=await body(request),sub=d.subscription;if(!sub||!allowedPushEndpoint(sub.endpoint)||!sub.keys?.p256dh||!sub.keys?.auth)return json({error:'Sottoscrizione non valida'},400);try{if(from64(sub.keys.p256dh).length!==65||from64(sub.keys.auth).length!==16)throw Error();}catch{return json({error:'Chiavi push non valide'},400);}const id=await digest(sub.endpoint),existing=await env.DB.prepare('SELECT user_id FROM cc_push WHERE id=?').bind(id).first();if(existing&&existing.user_id!==visitor(request))return json({error:'Dispositivo associato a un altro utente'},403);
    const now=Date.now();await env.DB.prepare('INSERT INTO cc_push(id,user_id,member_name,subscription,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET member_name=excluded.member_name,subscription=excluded.subscription,updated=excluded.updated').bind(id,visitor(request),String(d.name||'Amico').slice(0,100),JSON.stringify(sub),now,now).run();return json({ok:true});
  }
  if(path==='/api/push/unsubscribe'&&request.method==='POST'){const d=await body(request);await env.DB.prepare('DELETE FROM cc_push WHERE id=? AND user_id=?').bind(await digest(d.endpoint||''),visitor(request)).run();return json({ok:true});}
  return json({error:'Operazione non disponibile'},404);
}catch(err){return json({error:'Operazione non riuscita. Riprova.'},500);}}};
