import {defenseStats} from './survival.mjs';

export const endlessDefaults=()=>({bestWaves:0});
export const ENDLESS_CHOICES=[
 {id:'power',name:'火力强化',desc:'本局武器伤害 +25%，可叠加'},
 {id:'tempo',name:'射速强化',desc:'本局武器射速 +15%，可叠加'},
 {id:'repair',name:'防线维修',desc:'恢复 40% 生命上限与 60% 护盾上限'},
];
export function recordEndless(s){
 if(s.challenge?.kind!=='endless')return;
 s.endless??=endlessDefaults();
 s.endless.bestWaves=Math.max(s.endless.bestWaves,s.challenge.run.endlessRun.waves);
}
export function chooseEndless(s,id){
 const b=s.challenge?.kind==='endless'?s.challenge.run:null;
 const choice=ENDLESS_CHOICES.find(c=>c.id===id);
 if(!choice||!b||b.status!=='playing'||!b.endlessRun.pending)return {ok:false,message:'当前没有可选的无尽补给'};
 if(id==='repair'){
  const d=defenseStats(b);b.survival.hp=Math.min(d.maxHp,b.survival.hp+d.maxHp*.4);b.survival.shield=Math.min(d.maxShield,b.survival.shield+d.maxShield*.6);
 }else b.endlessRun[id]=(b.endlessRun[id]??0)+1;
 b.endlessRun.pending=false;
 return {ok:true,message:`已选择${choice.name}，继续守卫`};
}
