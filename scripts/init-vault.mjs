import fs from 'node:fs/promises';import {b64,derive,seal} from '../public/vault.js';
const password=process.env.INITIAL_VAULT_PASSWORD||process.env.CLUB_PASSWORD||'';
if(password.length<12||password.startsWith('replace-'))throw Error('Set CLUB_PASSWORD in .env to a unique password of at least 12 characters.');
const target='public/seed.clown';
try{await fs.access(target);throw Error('public/seed.clown already exists. Back it up and remove it explicitly before initializing a different archive.');}catch(err){if(err.code!=='ENOENT')throw err;}
const salt=b64(crypto.getRandomValues(new Uint8Array(16))),key=await derive(password,salt);
const state={version:1,groups:[{id:crypto.randomUUID(),name:'Il nostro circo',emoji:'🎪',members:[{id:'m1',name:'Doriano'},{id:'m2',name:'Amico'}],expenses:[],events:[],posts:[]}]};
await fs.writeFile(target,JSON.stringify(await seal(state,key,salt)),{flag:'wx'});
console.log('Created a new encrypted archive in public/seed.clown. The password was not written into the source.');
