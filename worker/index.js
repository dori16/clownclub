import {url64,from64,allowedPushEndpoint,sendPush} from './push.js';import {storeFor} from './store.js';
const textEncoder=new TextEncoder();
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function digest(value){return url64(await crypto.subtle.digest('SHA-256',textEncoder.encode(value)));}
const readCookie=(request,name)=>(request.headers.get('Cookie')||'').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
const CLUB_DAYS=365,ADMIN_HOURS=24;

// Sessions are signed cookies: "<kind>.<visitor>.<issued>.<expires>.<signature>". Nothing is stored server side.
async function secret(env){return env.SESSION_SECRET||await digest('clown-club:'+(env.CLUB_PASSWORD||'')+':'+(env.ADMIN_PASSWORD||''));}
async function sign(env,payload){const key=await crypto.subtle.importKey('raw',textEncoder.encode(await secret(env)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return url64(await crypto.subtle.sign('HMAC',key,textEncoder.encode(payload)));}
async function issue(env,kind,visitor,lifetime){const now=Date.now(),payload=`${kind}.${visitor}.${now}.${now+lifetime}`;return payload+'.'+await sign(env,payload);}
async function verify(env,token,kind){if(!token)return null;const parts=token.split('.');if(parts.length!==5||parts[0]!==kind)return null;const [,visitor,issued,expires,signature]=parts;if(Number(expires)<Date.now())return null;if(await digest(signature)!==await digest(await sign(env,parts.slice(0,4).join('.'))))return null;return {visitor,issued:Number(issued)};}
const cookieHeader=(name,value,path,maxAge,secure)=>`${name}=${value}; Path=${path}; HttpOnly;${secure?' Secure;':''} SameSite=Strict; Max-Age=${maxAge}`;
const isSecure=u=>u.protocol==='https:';

async function visitor(request,env){return (await verify(env,readCookie(request,'cc-club'),'c'))?.visitor||null;}
async function admin(request,env,id){const session=await verify(env,readCookie(request,'cc-admin'),'a');if(!session||session.visitor!==id)return false;const loggedOut=Number(await storeFor(env).get('cc:admin-logout:'+id)||0);return session.issued>loggedOut;}
async function body(request){const raw=await request.text();if(raw.length>6000000)throw Error('Richiesta troppo grande');return JSON.parse(raw||'{}');}
async function rate(env,key,max=10,windowMs=600000){const bucket=Math.floor(Date.now()/windowMs);return await storeFor(env).incr(`cc:rate:${key}:${bucket}`,Math.ceil(windowMs/1000))<=max;}
const clientIp=request=>request.headers.get('x-real-ip')||(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'local';
const samePassword=async(given,expected)=>!!expected&&await digest(String(given??''))===await digest(expected);
function safeSheetUrl(s){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(s);}
// Pasted values often carry spaces, newlines or quotes: strip them so the token matches the Apps Script one.
const clean=v=>String(v??'').trim().replace(/^(['"])(.*)\1$/,'$2').trim();
async function sheets(env){if(clean(env.SHEETS_URL)&&clean(env.SHEETS_TOKEN))return {url:clean(env.SHEETS_URL),token:clean(env.SHEETS_TOKEN),fromEnv:true};const saved=JSON.parse(await storeFor(env).get('cc:sheets')||'null');return saved&&{url:clean(saved.url),token:clean(saved.token)};}
async function pushRows(env){return Object.entries(await storeFor(env).hgetall('cc:push')).map(([id,raw])=>({id,...JSON.parse(raw)}));}

export default {async fetch(request,env,ctx){try{const u=new URL(request.url),path=u.pathname;
  if(!path.startsWith('/api/')){const a=typeof ASSETS!=='undefined'?ASSETS:{};const asset=a[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(from64(asset.data),{headers:{'Content-Type':asset.type,'Cache-Control':path==='/sw.js'?'no-cache':'public,max-age=0,must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...(path==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})}});}
  if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==u.origin)return json({error:'Origine non autorizzata'},403);
  if(!env.CLUB_PASSWORD)return json({error:'CLUB_PASSWORD non configurata sul server'},500);
  if(path==='/api/login'&&request.method==='POST'){
    if(!await rate(env,'login:'+clientIp(request),10))return json({error:'Troppi tentativi. Riprova tra qualche minuto.'},429);
    const d=await body(request);if(!await samePassword(d.password,env.CLUB_PASSWORD))return json({error:'Password errata'},401);
    const id=await visitor(request,env)||url64(crypto.getRandomValues(new Uint8Array(12)));
    return json({ok:true},200,{'Set-Cookie':cookieHeader('cc-club',await issue(env,'c',id,CLUB_DAYS*86400000),'/',CLUB_DAYS*86400,isSecure(u))});
  }
  const id=await visitor(request,env);
  if(!id)return json({error:'Entra con la password del circo'},401);
  if(path==='/api/whoami')return json({isDoriano:true});
  if(path==='/api/club/status')return json({connected:!!await sheets(env),pushReady:!!env.VAPID_PUBLIC_KEY});
  if(path==='/api/admin/login'&&request.method==='POST'){
    if(!await rate(env,'admin:'+clientIp(request),5))return json({error:'Troppi tentativi. Riprova tra qualche minuto.'},429);
    const d=await body(request);if(!await samePassword(d.password,env.ADMIN_PASSWORD))return json({error:'Password errata'},401);
    return json({ok:true},200,{'Set-Cookie':cookieHeader('cc-admin',await issue(env,'a',id,ADMIN_HOURS*3600000),'/api/admin',ADMIN_HOURS*3600,isSecure(u))});
  }
  if(path.startsWith('/api/admin/')){
    if(!await admin(request,env,id))return json({error:'Sblocca l’area Doriano con la password'},403);
    if(path==='/api/admin/session')return json({ok:true});
    if(path==='/api/admin/logout'&&request.method==='POST'){await storeFor(env).set('cc:admin-logout:'+id,String(Date.now()));return json({ok:true},200,{'Set-Cookie':cookieHeader('cc-admin','','/api/admin',0,isSecure(u))});}
    if(path==='/api/admin/script'||path==='/api/admin/guide'){const filename=path.endsWith('script')?'Google-Sheets.gs':'GUIDA.md',entry=typeof ADMIN_ASSETS!=='undefined'?ADMIN_ASSETS[filename]:null;if(!entry)return json({error:'File non disponibile'},404);return new Response(from64(entry.data),{headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${filename}"`}});}
    if(path==='/api/admin/sheets'){
      const saved=await sheets(env);
      if(request.method==='GET')return json({url:saved?.url||'',hasToken:!!saved?.token,fromEnv:!!saved?.fromEnv});
      if(saved?.fromEnv)return json({error:'Il foglio è configurato nelle variabili di Vercel (SHEETS_URL e SHEETS_TOKEN): modificalo lì'},409);
      if(request.method==='DELETE'){await storeFor(env).del('cc:sheets');return json({ok:true});}
      const d=await body(request);d.url=clean(d.url);d.token=clean(d.token);
      if(!safeSheetUrl(d.url)||!(d.token||saved?.token)||String(d.token||saved?.token).length<24)return json({error:'URL o token non valido'},400);await storeFor(env).set('cc:sheets',JSON.stringify({url:d.url,token:d.token||saved.token}));return json({ok:true});
    }
    if(path==='/api/admin/subscribers'){const devices=(await pushRows(env)).sort((a,b)=>b.updated-a.updated).map(({member_name,created,updated})=>({member_name,created,updated}));return json({devices});}
    if(path==='/api/admin/push'&&request.method==='POST'){
      const d=await body(request),title=String(d.title||'').trim(),message=String(d.body||'').trim();if(!title||!message||title.length>80||message.length>500)return json({error:'Inserisci titolo (max 80) e messaggio (max 500)'},400);
      if(!await rate(env,'broadcast',30,3600000))return json({error:'Troppi invii ravvicinati'},429);
      const results=await pushRows(env);if(!results.length)return json({error:'Nessun dispositivo ha attivato le notifiche'},400);
      const report={total:results.length,accepted:0,expired:0,failed:0};const payload={title,body:message,url:'/',tag:'clown-'+crypto.randomUUID()};
      for(let i=0;i<results.length;i+=8){await Promise.all(results.slice(i,i+8).map(async row=>{try{const r=await sendPush(JSON.parse(row.subscription),payload,env);if(r.ok)report.accepted++;else if(r.status===404||r.status===410){report.expired++;await storeFor(env).hdel('cc:push',row.id);}else report.failed++;}catch{report.failed++;}}));}return json(report);
    }
    return json({error:'Operazione non disponibile'},404);
  }
  if(path==='/api/sync'){
    const settings=await sheets(env);if(!settings)return json({ok:false,error:'Il foglio non è ancora collegato da Doriano'},409);const target=new URL(settings.url);let opts={redirect:'follow',signal:AbortSignal.timeout(25000)};
    if(request.method==='GET'){target.searchParams.set('token',settings.token);target.searchParams.set('t',Date.now());}else if(request.method==='POST'){const d=await body(request);opts={...opts,method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:settings.token,expectedRevision:d.expectedRevision,envelope:d.envelope})};}else return json({error:'Metodo non supportato'},405);
    let r;try{r=await fetch(target,opts);}catch{return json({ok:false,error:'Google Sheets non raggiungibile. Riprova tra poco.'},502);}
    const text=await r.text();let data;try{data=JSON.parse(text);}catch{const login=/accounts\.google\.com|ServiceLogin/.test(r.url+text);return json({ok:false,error:login?'Il foglio chiede il login Google: in Apps Script distribuisci la web app con accesso “Chiunque”.':`Il foglio non risponde con dati validi (HTTP ${r.status}). Controlla che l’URL finisca con /exec e che il deployment sia aggiornato.`},502);}
    if(data&&data.ok===false&&!data.conflict&&data.error)data.error='Google Sheets: '+data.error;
    return json(data);
  }
  if(path==='/api/push/key')return json({publicKey:env.VAPID_PUBLIC_KEY});
  if(path==='/api/push/subscribe'&&request.method==='POST'){
    if(!await rate(env,'subscribe:'+id,50,3600000))return json({error:'Troppi dispositivi registrati in poco tempo'},429);
    const d=await body(request),sub=d.subscription;if(!sub||!allowedPushEndpoint(sub.endpoint)||!sub.keys?.p256dh||!sub.keys?.auth)return json({error:'Sottoscrizione non valida'},400);try{if(from64(sub.keys.p256dh).length!==65||from64(sub.keys.auth).length!==16)throw Error();}catch{return json({error:'Chiavi push non valide'},400);}
    const key=await digest(sub.endpoint),existing=JSON.parse(await storeFor(env).hget('cc:push',key)||'null');if(existing&&existing.user_id!==id)return json({error:'Dispositivo associato a un altro utente'},403);
    const now=Date.now();await storeFor(env).hset('cc:push',key,JSON.stringify({user_id:id,member_name:String(d.name||'Amico').slice(0,100),subscription:JSON.stringify(sub),created:existing?.created||now,updated:now}));return json({ok:true});
  }
  if(path==='/api/push/unsubscribe'&&request.method==='POST'){const d=await body(request),key=await digest(d.endpoint||''),existing=JSON.parse(await storeFor(env).hget('cc:push',key)||'null');if(existing?.user_id===id)await storeFor(env).hdel('cc:push',key);return json({ok:true});}
  return json({error:'Operazione non disponibile'},404);
}catch(err){const message=String(err?.message||'');console.error('[clown-club]',message);return json({error:/^Redis/.test(message)?message:'Operazione non riuscita. Riprova.'},500);}}};
