import {cleanNickname,validScore} from '../../src/leaderboard-rules.mjs';
const encoder=new TextEncoder();
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function token(request){const value=request.headers.get('Authorization')||'';return /^Bearer [a-f0-9]{64}$/.test(value)?value.slice(7):null;}
function response(value,status=200,origin=''){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 if(status===429)headers['Retry-After']='3600';
 return new Response(status===204?null:JSON.stringify(value),{status,headers});
}
async function readBody(request){
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw{status:415,message:'请使用 JSON 提交'};
 if(Number(request.headers.get('Content-Length'))>2048)throw{status:413,message:'提交内容过长'};
 const reader=request.body?.getReader();if(!reader)throw{status:400,message:'缺少战绩'};
 let size=0;const chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw{status:413,message:'提交内容过长'};}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw{status:400,message:'无法识别提交的战绩'};}
}
const fields='public_id AS id,nickname,stage,waves,achieved_at AS achievedAt';
async function mine(db,hash){
 if(!hash)return null;
 const row=await db.prepare(`SELECT ${fields} FROM scores WHERE player_hash=?1`).bind(hash).first();if(!row)return null;
 const {ahead}=await db.prepare(`SELECT COUNT(*) AS ahead FROM scores WHERE stage>?1 OR (stage=?1 AND waves>?2) OR (stage=?1 AND waves=?2 AND achieved_at<?3) OR (stage=?1 AND waves=?2 AND achieved_at=?3 AND public_id<?4)`).bind(row.stage,row.waves,row.achievedAt,row.id).first();
 return{...row,rank:ahead+1};
}
async function limit(request,env,now){
 const address=request.headers.get('CF-Connecting-IP')||'local';
 const key=await digest(`${env.RATE_LIMIT_SALT}:${address}`),window=Math.floor(now/3600000)*3600000;
 const row=await env.DB.prepare(`INSERT INTO rate_limits(key,window_start,count) VALUES(?1,?2,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start=excluded.window_start THEN rate_limits.count+1 ELSE 1 END,window_start=excluded.window_start RETURNING count`).bind(key,window).first();
 if(row.count>30)throw{status:429,message:'提交太频繁，请 1 小时后再试。已有战绩会保留。'};
 await env.DB.prepare('DELETE FROM rate_limits WHERE window_start<?1').bind(window-86400000).run();
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGINS||'https://xdw-h.github.io').split(',').map(s=>s.trim());
  if(origin&&!allowed.includes(origin))return response({error:'此访问来源未开放'},403);
  const reply=(v,status)=>response(v,status,origin);
  if(!['/leaderboard','/scores','/health'].includes(new URL(request.url).pathname))return reply({error:'接口不存在'},404);
  if(request.method==='OPTIONS')return reply(null,204);
  if(!env.DB||typeof env.RATE_LIMIT_SALT!=='string'||env.RATE_LIMIT_SALT.length<32)return reply({error:'荣誉榜暂未就绪，请稍后再试'},503);
  const path=new URL(request.url).pathname;
  try{
   if(path==='/health'&&request.method==='GET'){await env.DB.prepare('SELECT COUNT(*) AS count FROM scores').bind().first();return reply({ok:true,version:'1.8.0'});}
   if(path==='/leaderboard'&&request.method==='GET'){
    const secret=token(request),hash=secret?await digest(secret):null;
    const rows=await env.DB.prepare(`SELECT ${fields} FROM scores ORDER BY stage DESC,waves DESC,achieved_at ASC,public_id ASC LIMIT 100`).bind().all();
    return reply({entries:rows.results.map((r,i)=>({...r,rank:i+1})),mine:await mine(env.DB,hash)});
   }
   if(path==='/scores'&&request.method==='POST'){
    if(!origin)return reply({error:'缺少访问来源'},403);
    const secret=token(request);if(!secret)return reply({error:'玩家身份无效，请刷新重试'},401);
    const data=await readBody(request),nickname=cleanNickname(data?.nickname);
    if(!nickname||!validScore(data))return reply({error:'昵称需为 1–16 个中英文字母、数字、空格或短横线；战绩须为有效闯关记录'},400);
    const now=Date.now();await limit(request,env,now);const hash=await digest(secret);
    const better='excluded.stage>scores.stage OR (excluded.stage=scores.stage AND excluded.waves>scores.waves)';
    await env.DB.prepare(`INSERT INTO scores(player_hash,public_id,nickname,stage,waves,achieved_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?6)
     ON CONFLICT(player_hash) DO UPDATE SET nickname=excluded.nickname,
     achieved_at=CASE WHEN ${better} THEN excluded.achieved_at ELSE scores.achieved_at END,
     stage=CASE WHEN ${better} THEN excluded.stage ELSE scores.stage END,
     waves=CASE WHEN ${better} THEN excluded.waves ELSE scores.waves END,updated_at=excluded.updated_at`).bind(hash,crypto.randomUUID(),nickname,data.stage,data.waves,now).run();
    return reply({ok:true,mine:await mine(env.DB,hash)});
   }
   return reply({error:'不支持的请求方式'},405);
  }catch(error){return reply({error:error?.status?error.message:'荣誉榜暂时不可用，请稍后重试'},error?.status||503);}
 }
};
