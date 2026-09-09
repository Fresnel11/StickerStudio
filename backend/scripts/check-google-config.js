import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
const config=parseEnv(await readFile(new URL('../.env',import.meta.url),'utf8'));
const origin=config.APP_ORIGIN||'http://127.0.0.1:5173';
try {
 const response=await fetch(`${origin}/api/auth/google`,{redirect:'manual',signal:AbortSignal.timeout(5000)});
 const location=response.headers.get('location');
 if(!location) throw new Error('Pas de redirection OAuth reçue');
 const target=new URL(location,origin);
 console.log(JSON.stringify({status:response.status,googleConfiguredInFile:!!config.GOOGLE_CLIENT_ID&&!!config.GOOGLE_CLIENT_SECRET,redirectsToGoogle:target.hostname==='accounts.google.com',runningClientMatchesEnv:target.searchParams.get('client_id')===config.GOOGLE_CLIENT_ID,callbackMatchesEnv:target.searchParams.get('redirect_uri')===`${origin}/api/auth/google/callback`,appOrigin:origin},null,2));
} catch(error){console.error('Diagnostic :',error.message);process.exitCode=1;}
