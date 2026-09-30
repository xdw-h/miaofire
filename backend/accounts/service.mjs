import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {validateState} from '../../src/storage.mjs';

const derive=promisify(scrypt), hash=v=>createHash('sha256').update(v).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const cookieName='miaofire_session';
const passwordValid=p=>typeof p==='string'&&p.length>=10&&p.length<=128;
const name=v=>typeof v==='string'?v.toLowerCase():'';
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function passwordHash(password){const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `${salt}:${key.toString('hex')}`;}
async function passwordMatches(password,stored){const [salt,key]=stored.split(':');const candidate=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return timingSafeEqual(candidate,Buffer.from(key,'hex'));}
export function createAccountService({database,origins,secure=true,now=Date.now,authLimit=20}){
 const db=new DatabaseSync(database);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL,honor_token TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS saves(user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,payload TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS save_backups(user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,payload TEXT NOT NULL,updated INTEGER NOT NULL);`);
 const limits=new Map();let activeHashes=0;
 function throttle(key,limit){const time=now(),bucket=limits.get(key);if(!bucket||bucket.until<=time){if(limits.size>10000){for(const [k,b]of limits)if(b.until<=time)limits.delete(k);if(limits.size>10000)throw fail(429,'请求过多，请稍后重试。');}limits.set(key,{count:1,until:time+900000});return;}if(++bucket.count>limit)throw fail(429,'请求过于频繁，请在 15 分钟后重试。');}
 const publicUser=u=>({id:u.id,username:u.username,honorToken:u.honor_token});
 function auth(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(hash(token),now())||null;}
 function setSession(res,user){const token=secret();db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,now()+30*86400000);res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/api/account; HttpOnly; SameSite=Strict; Max-Age=2592000${secure?'; Secure':''}`);}
 const saved=id=>{const row=db.prepare('SELECT * FROM saves WHERE user_id=?').get(id);return row?{save:JSON.parse(row.payload),revision:row.revision,updatedAt:row.updated}:{save:null,revision:0,updatedAt:null};};
 async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw fail(415,'需要 JSON 请求。');let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>262144)throw fail(413,'存档过大。');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks));}catch{throw fail(400,'请求格式错误。');}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(!['GET','POST'].includes(req.method))throw fail(405,'不支持的请求方法。');
   if(req.method==='POST'&&!origins.includes(req.headers.origin))throw fail(403,'请从游戏原地址操作。');
   const ip=req.headers['x-real-ip']||req.socket.remoteAddress;
   if(path==='/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send({ok:true,service:'miaofire-accounts'});}
   if(['/register','/login','/recover'].includes(path)&&req.method==='POST'){
    throttle(`auth:${ip}`,authLimit);
    const data=await body(req),username=name(data.username);
    if(!/^[a-z0-9_]{3,24}$/.test(username)||!passwordValid(data.password))throw fail(400,'用户名为 3–24 位英文字母、数字或下划线，密码为 10–128 个字符。');
    if(activeHashes>=4)throw fail(429,'服务繁忙，请稍后重试。');activeHashes++;
    try{
     let user=db.prepare('SELECT * FROM users WHERE username=?').get(username);
     if(path==='/register'){
      if(user)throw fail(409,'用户名已存在。');
      const recoveryCode=secret(),encoded=await passwordHash(data.password);
      user={id:randomUUID(),username,password:encoded,recovery:hash(recoveryCode),honor_token:secret()};
      try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id,username,encoded,user.recovery,user.honor_token);}catch(e){if(e.message.includes('UNIQUE'))throw fail(409,'用户名已存在。');throw e;}
      setSession(res,user);return send({user:publicUser(user),recoveryCode},201);
     }
     if(path==='/recover'){
      if(!user||typeof data.recoveryCode!=='string'||data.recoveryCode.length>128||hash(data.recoveryCode)!==user.recovery)throw fail(401,'用户名或恢复码错误。');
      const recoveryCode=secret(),encoded=await passwordHash(data.password);
      db.exec('BEGIN IMMEDIATE');try{const changed=db.prepare('UPDATE users SET password=?,recovery=? WHERE id=? AND recovery=?').run(encoded,hash(recoveryCode),user.id,user.recovery);if(!changed.changes)throw fail(401,'恢复码已使用。');db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
      return send({ok:true,recoveryCode});
     }
     const valid=user?await passwordMatches(data.password,user.password):(await passwordHash(data.password),false);
     if(!valid)throw fail(401,'用户名或密码错误。');
     // Password recovery may have invalidated the account while scrypt was running.
     if(db.prepare('SELECT password FROM users WHERE id=?').get(user.id)?.password!==user.password)throw fail(401,'密码已变更，请重新登录。');
     setSession(res,user);return send({user:publicUser(user)});
    }finally{activeHashes--;}
   }
   const user=auth(req);
   if(path==='/me'&&req.method==='GET')return send({user:user?publicUser(user):null});
   if(!user)throw fail(401,'登录已过期，请重新登录。');
   if(path==='/save'&&req.headers['x-account-id']&&req.headers['x-account-id']!==user.id)throw fail(403,'账号已在其他页面切换，请重新登录。');
   if(path==='/logout'&&req.method==='POST'){const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(raw));res.setHeader('Set-Cookie',`${cookieName}=; Path=/api/account; HttpOnly; SameSite=Strict; Max-Age=0${secure?'; Secure':''}`);return send({ok:true});}
   if(path==='/save'&&req.method==='GET')return send(saved(user.id));
   if(path==='/save'&&req.method==='POST'){
    throttle(`save:${user.id}`,180);const data=await body(req);
    let valid=false;try{valid=data.save?.version===6&&validateState(data.save.state,6);}catch{}
    if(!valid||!Number.isSafeInteger(data.revision)||data.revision<0)throw fail(400,'存档校验失败，原进度已保留。');
    const payload=JSON.stringify(data.save),time=now();db.exec('BEGIN IMMEDIATE');
    try{const old=db.prepare('SELECT * FROM saves WHERE user_id=?').get(user.id);if((old?.revision||0)!==data.revision)throw fail(409,'云存档已在其他设备更新，请重新选择进度。');if(old)db.prepare('INSERT OR REPLACE INTO save_backups VALUES(?,?,?,?)').run(user.id,old.revision,old.payload,old.updated);db.prepare('INSERT OR REPLACE INTO saves VALUES(?,?,?,?)').run(user.id,data.revision+1,payload,time);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    return send({revision:data.revision+1,updatedAt:time});
   }
   throw fail(404,'接口不存在。');
  }catch(e){if(!res.writableEnded){if(e.status===429)res.setHeader('Retry-After','900');send({error:e.status?e.message:'服务暂时不可用，请稍后重试。'},e.status||500);}}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return {server,db,close:()=>new Promise(r=>{server.close(()=>{db.close();r();});server.closeAllConnections();})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const origins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean);if(!origins.length)throw Error('ALLOWED_ORIGINS required');
 const app=createAccountService({database:process.env.ACCOUNT_DB||'accounts.sqlite',origins,secure:process.env.DEV_HTTP!=='1'});
 app.server.listen(Number(process.env.PORT||4186),'127.0.0.1',()=>console.log('Miaofire account service ready'));
}
