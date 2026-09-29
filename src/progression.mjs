export const PETS = {
  squirrel: {name:'松果松鼠',unlock:1,stat:'attack',label:'攻击',base:.08,step:.03,color:'#c89157',story:'把松果的力量，装进每一颗子弹。'},
  bird: {name:'疾风雀',unlock:3,stat:'speed',label:'射速',base:.06,step:.02,color:'#6aaca2',story:'翅膀轻轻一振，火力就跟上了风。'},
  raccoon: {name:'招财狸',unlock:5,stat:'income',label:'金币',base:.12,step:.04,color:'#a39783',story:'森林里的每一枚金币，都逃不过它的眼睛。'},
};
export const MILESTONES = [
  {id:'kills10',field:'totalKills',target:10,reward:15,label:'击碎 10 棵树'},
  {id:'kills50',field:'totalKills',target:50,reward:30,label:'击碎 50 棵树'},
  {id:'kills150',field:'totalKills',target:150,reward:60,label:'击碎 150 棵树'},
  {id:'stage3',field:'bestEver',target:3,reward:20,label:'通过第 3 关'},
  {id:'stage5',field:'bestEver',target:5,reward:40,label:'通过第 5 关'},
  {id:'stage10',field:'bestEver',target:10,reward:80,label:'通过第 10 关'},
];
export const CHALLENGES = [
  {name:'林边练习',hp:1200,first:30,repeat:10},
  {name:'松林试炼',hp:2400,first:50,repeat:15},
  {name:'疾风演练',hp:4800,first:80,repeat:20},
  {name:'山谷特训',hp:9600,first:120,repeat:30},
  {name:'森林精英',hp:19200,first:180,repeat:40},
];
export function progressionDefaults(){return {fish:0,pets:{squirrel:0,bird:0,raccoon:0},activePet:null,claimedMilestones:[],challengeClears:0,challenge:null};}
const fail=message=>({ok:false,message}),ok=message=>({ok:true,message});
export function petBonus(s){
  const result={attack:1,speed:1,income:1},p=PETS[s.activePet],level=s.pets?.[s.activePet];
  if(p&&level>0)result[p.stat]+=p.base+p.step*(level-1);
  return result;
}
export function claimPet(s,id){
  if(s.challenge)return fail('挑战结束后再领取伙伴');
  const p=PETS[id];if(!p||s.bestEver<p.unlock)return fail('还没有达到解锁关卡');
  if(s.pets[id]>0)return fail('已经领取过这位伙伴');
  s.pets[id]=1;return ok(`${p.name}加入营地，记得点击携带`);
}
export function carryPet(s,id){
  if(s.challenge)return fail('挑战中不能切换伙伴');
  if(id!==null&&(!PETS[id]||!s.pets[id]))return fail('请先领取这位伙伴');
  s.activePet=id;return ok(id?`${PETS[id].name}跟随出战`:'伙伴回营地休息了');
}
export function feedCost(s,id){return PETS[id]&&s.pets[id]>0?10+5*s.pets[id]:Infinity;}
export function feedPet(s,id){
  if(s.challenge)return fail('挑战结束后再喂养');
  if(!PETS[id]||!s.pets[id])return fail('请先领取这位伙伴');
  if(s.pets[id]>=20)return fail('伙伴已达到 Lv.20');
  const cost=feedCost(s,id);if(s.fish<cost)return fail(`还差 ${cost-s.fish} 份鱼干`);
  s.fish-=cost;s.pets[id]++;return ok(`${PETS[id].name}升至 Lv.${s.pets[id]}`);
}
export function claimMilestone(s,id){
  if(s.challenge)return fail('挑战结束后再领取奖励');
  const m=MILESTONES.find(m=>m.id===id);
  if(!m||s[m.field]<m.target)return fail('还没有完成这个目标');
  if(s.claimedMilestones.includes(id))return fail('奖励已经领取');
  s.claimedMilestones.push(id);s.fish=Math.min(1e150,s.fish+m.reward);return ok(`获得 ${m.reward} 份鱼干`);
}
export function availableRewards(s){return Object.entries(PETS).filter(([id,p])=>s.bestEver>=p.unlock&&!s.pets[id]).length+MILESTONES.filter(m=>s[m.field]>=m.target&&!s.claimedMilestones.includes(m.id)).length;}
