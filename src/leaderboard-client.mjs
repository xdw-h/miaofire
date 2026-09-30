import {cleanNickname,validScore} from './leaderboard-rules.mjs';
export const HONOR_KEY='miaofire.honor.v1';
const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
function newToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const validEndless=s=>!!s&&Number.isInteger(s.waves)&&s.waves>0&&s.waves<=99999;
const higher=(a,b,endless=false)=>!a?b:!b?a:(endless?b.waves>a.waves:b.stage>a.stage||b.stage===a.stage&&b.waves>a.waves)?b:a;
function validateEntry(row,valid){return !!row&&typeof row.id==='string'&&row.id.length<80&&!!cleanNickname(row.nickname)&&valid(row)&&Number.isInteger(row.rank)&&row.rank>=1&&Number.isSafeInteger(row.achievedAt)&&row.achievedAt>0;}
export function createLeaderboardClient({storage,api='',board='main',fetcher=globalThis.fetch.bind(globalThis),timeout=10000,pageUrl=globalThis.location?.href}){
 const endless=board==='endless',valid=endless?validEndless:validScore,bestKey=endless?'endlessBest':'best',listPath=endless?'/endless-leaderboard':'/leaderboard';
 let profile,persistent=true,controller;
 try{profile=JSON.parse(storage.getItem(HONOR_KEY)||'null');}catch{persistent=false;}
 if(!validToken(profile?.token))profile={token:newToken(),nickname:''};
 profile={token:profile.token,nickname:cleanNickname(profile.nickname)||'',best:validScore(profile.best)?{stage:profile.best.stage,waves:profile.best.waves}:null,endlessBest:validEndless(profile.endlessBest)?{waves:profile.endlessBest.waves}:null};
 function readSaved(){try{return JSON.parse(storage.getItem(HONOR_KEY)||'null');}catch{return null;}}
 function save(rename=false){try{
  const saved=readSaved();
  if(saved?.token===profile.token){
   if(!rename)profile.nickname=cleanNickname(saved.nickname)||profile.nickname;
   profile.best=higher(profile.best,validScore(saved.best)?{stage:saved.best.stage,waves:saved.best.waves}:null);
   profile.endlessBest=higher(profile.endlessBest,validEndless(saved.endlessBest)?{waves:saved.endlessBest.waves}:null,true);
  }
  storage.setItem(HONOR_KEY,JSON.stringify(profile));persistent=true;
 }catch{persistent=false;}return persistent;}
 save();
 function remember(score){if(valid(score)&&higher(profile[bestKey],score,endless)===score){profile[bestKey]=endless?{waves:score.waves}:{stage:score.stage,waves:score.waves};save();}return profile[bestKey]?{...profile[bestKey]}:null;}
 let base='';try{if(api){const u=new URL(api,pageUrl);if((u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))&&!u.username&&!u.password&&!u.search&&!u.hash)base=u.href.replace(/\/$/,'');}}catch{}
 async function request(path,data){
  if(!base)throw Error('荣誉榜尚未开放，请稍后再来。游戏进度不受影响。');
  controller?.abort();const current=new AbortController();controller=current;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;current.abort();},timeout);
  try{
   const result=await fetcher(base+path,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${profile.token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:current.signal,cache:'no-store',credentials:'omit'});
   let value;try{value=await result.json();}catch{throw Error('荣誉榜返回异常，请稍后重试。');}
   if(!result.ok)throw Error(typeof value?.error==='string'?value.error:'荣誉榜暂时无法访问，请稍后重试。');
   if(data&&value?.ok===true&&value.mine===undefined)return await request(listPath);
   if(path===listPath&&(!Array.isArray(value.entries)||value.entries.length>100||!value.entries.every(row=>validateEntry(row,valid))))throw Error('荣誉榜数据异常，请稍后重试。');
   if(value.mine!==null&&!validateEntry(value.mine,valid))throw Error('个人排名数据异常，请稍后重试。');
   if(value.mine)remember(value.mine);
   return value;
  }catch(error){
   if(timedOut)throw Error('连接荣誉榜超时，请检查网络后重试。');
   if(error.name==='AbortError')throw error;
   if(error instanceof TypeError||error.message==='offline')throw Error('无法连接荣誉榜，请检查网络后重试。');
   throw error;
  }finally{clearTimeout(timer);if(controller===current)controller=null;}
 }
 return{
  remember,
  get identity(){return profile.token;},get nickname(){const saved=readSaved();return saved?.token===profile.token?cleanNickname(saved.nickname)||profile.nickname:profile.nickname;},get ready(){return !!base;},
  load:()=>request(listPath),
  async submit(nickname,score){
   const name=cleanNickname(nickname);if(!name)throw Error('昵称需为 1–16 个中英文字母、数字、空格、下划线或短横线。');
   if(!valid(score))throw Error(endless?'先在无尽守卫中完成一波，再来留下战绩吧。':'先击败一个敌人，再来留下战绩吧。');
   profile.nickname=name;if(!save(true))throw Error('浏览器无法保存上榜身份，请允许本地存储后重试。');
   return request(endless?'/endless-scores':'/scores',{nickname:name,...score});
  },
  abort(){controller?.abort();controller=null;}
 };
}
