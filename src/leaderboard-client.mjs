import {cleanNickname,validScore} from './leaderboard-rules.mjs';
export const HONOR_KEY='miaofire.honor.v1';
const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
function newToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function validateEntry(row){return !!row&&typeof row.id==='string'&&row.id.length<80&&!!cleanNickname(row.nickname)&&validScore(row)&&Number.isInteger(row.rank)&&row.rank>=1&&Number.isSafeInteger(row.achievedAt)&&row.achievedAt>0;}
export function createLeaderboardClient({storage,api='',fetcher=globalThis.fetch.bind(globalThis),timeout=10000}){
 let profile,persistent=true,controller;
 try{profile=JSON.parse(storage.getItem(HONOR_KEY)||'null');}catch{persistent=false;}
 if(!validToken(profile?.token))profile={token:newToken(),nickname:''};
 profile={token:profile.token,nickname:cleanNickname(profile.nickname)||'',best:validScore(profile.best)?{stage:profile.best.stage,waves:profile.best.waves}:null};
 function save(){try{storage.setItem(HONOR_KEY,JSON.stringify(profile));persistent=true;}catch{persistent=false;}return persistent;}
 save();
 function remember(score){if(validScore(score)&&(!profile.best||score.stage>profile.best.stage||score.stage===profile.best.stage&&score.waves>profile.best.waves)){profile.best={stage:score.stage,waves:score.waves};save();}return profile.best?{...profile.best}:null;}
 let base='';try{const u=new URL(api);if((u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))&&!u.username&&!u.password&&!u.search&&!u.hash)base=u.href.replace(/\/$/,'');}catch{}
 async function request(path,data){
  if(!base)throw Error('荣誉榜尚未开放，请稍后再来。游戏进度不受影响。');
  controller?.abort();const current=new AbortController();controller=current;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;current.abort();},timeout);
  try{
   const result=await fetcher(base+path,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${profile.token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:current.signal,cache:'no-store',credentials:'omit'});
   let value;try{value=await result.json();}catch{throw Error('荣誉榜返回异常，请稍后重试。');}
   if(!result.ok)throw Error(typeof value?.error==='string'?value.error:'荣誉榜暂时无法访问，请稍后重试。');
   if(path==='/leaderboard'&&(!Array.isArray(value.entries)||value.entries.length>100||!value.entries.every(validateEntry)))throw Error('荣誉榜数据异常，请稍后重试。');
   if(value.mine!==null&&!validateEntry(value.mine))throw Error('个人排名数据异常，请稍后重试。');
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
  get identity(){return profile.token;},get nickname(){return profile.nickname;},get ready(){return !!base;},
  load:()=>request('/leaderboard'),
  async submit(nickname,score){
   const name=cleanNickname(nickname);if(!name)throw Error('昵称需为 1–16 个中英文字母、数字、空格、下划线或短横线。');
   if(!validScore(score))throw Error('先击败一个敌人，再来留下战绩吧。');
   profile.nickname=name;if(!save())throw Error('浏览器无法保存上榜身份，请允许本地存储后重试。');
   return request('/scores',{nickname:name,...score});
  },
  abort(){controller?.abort();controller=null;}
 };
}
