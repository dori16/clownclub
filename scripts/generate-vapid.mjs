import {generateKeyPairSync} from 'node:crypto';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=privateKey.export({format:'jwk'});
const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
console.log('# Save these values in .env locally and in server-side environment variables in production.');
console.log('# Do not rotate this pair after devices subscribe.');
console.log('VAPID_PUBLIC_KEY='+publicKey);
console.log("VAPID_PRIVATE_JWK='"+JSON.stringify(jwk)+"'");
