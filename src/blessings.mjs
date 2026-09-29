export const BLESSINGS={
 attack:{name:'锋利爪牙',desc:'全队攻击 +8%',symbol:'✦'},
 speed:{name:'疾风步伐',desc:'全队射速 +5%',symbol:'➚'},
 harvest:{name:'战斗补给',desc:'每击败一个敌人，恢复 6 点护盾',symbol:'✚'},
 courage:{name:'绝境勇气',desc:'小队生命不高于 35% 时，伤害 +20%',symbol:'♥'},
 barrier:{name:'星光壁垒',desc:'护盾上限 +15，立即补充新增容量',symbol:'⬡'},
 hunter:{name:'巨木猎手',desc:'对 Boss 伤害 +12%',symbol:'◎'},
};
export const expeditionDefaults=()=>({milestone:0,choices:[],pending:null});
export function blessingCount(s,id){return s.challenge?0:(s.expedition?.choices.filter(v=>v===id).length||0);}
export function offerBlessing(s,stage){
 const e=s.expedition;if(!e||stage<3||stage%3||stage<=e.milestone||e.pending)return false;
 const keys=Object.keys(BLESSINGS);let seed=(stage*2654435761+s.totalKills+s.crystals)%4294967296;
 for(let i=keys.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[keys[i],keys[j]]=[keys[j],keys[i]];}
 e.milestone=stage;e.pending={stage,options:keys.slice(0,3)};s.accumulator=0;return true;
}
export function chooseBlessing(s,id){
 if(s.challenge||!s.expedition?.pending?.options.includes(id))return{ok:false,message:'请选择当前提供的祝福'};
 s.expedition.choices.push(id);s.expedition.pending=null;
 if(id==='barrier')s.survival.shield+=15;
 return{ok:true,message:`获得「${BLESSINGS[id].name}」，本轮持续生效`};
}
export function validateExpedition(e,best){
 return !!e&&Number.isInteger(e.milestone)&&e.milestone>=0&&e.milestone<=best&&e.milestone%3===0&&
 Array.isArray(e.choices)&&e.choices.length<=Math.floor(e.milestone/3)&&e.choices.every(id=>Object.hasOwn(BLESSINGS,id))&&
 (e.pending===null||!!e.pending&&e.pending.stage===e.milestone&&e.milestone>=3&&e.choices.length<e.milestone/3&&Array.isArray(e.pending.options)&&e.pending.options.length===3&&new Set(e.pending.options).size===3&&e.pending.options.every(id=>Object.hasOwn(BLESSINGS,id)));
}
