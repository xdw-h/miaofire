export const BOUNTIES={
 guardian:{name:'护盾守卫',hp:6000,armor:0,art:'boss',desc:'登场获得 600 护盾，此后每 8 秒补至 600。护盾不叠加，保留爆发集中破盾。'},
 toxic:{name:'剧毒菇王',hp:5200,armor:0,art:'mushroom',desc:'每次反击附加 4 秒剧毒，每秒直接扣除 6 生命。毒伤无视护盾，及时急救。'},
 berserker:{name:'狂暴甲王',hp:6500,armor:.25,art:'armored',desc:'蓄力 3 秒后重击，半血后伤害翻倍。穿透配件与护盾技能更有效。'},
};
export const bountyDefaults=()=>({cleared:[]});
export const bountyReward=(s,id)=>s.bounties?.cleared.includes(id)?4:12;
export function bountyEnemy(id){const b=BOUNTIES[id];return {kind:'boss',bounty:id,art:b.art,name:b.name,label:b.desc,level:10,hp:b.hp,armor:b.armor,coinMultiplier:0};}
export function tickBountyShield(s,dt){
 if(s.bountyRun?.id!=='guardian')return [];
 const b=s.bountyRun;b.shieldClock+=dt;
 if(b.shieldStarted&&b.shieldClock<8-1e-8)return [];
 if(b.shieldStarted)b.shieldClock=Math.max(0,b.shieldClock-8);
 b.shieldStarted=true;s.combat.enemyShield=600;
 return [{type:'bounty-shield',amount:600}];
}
export function tickBountyPoison(s,dt){
 const b=s.bountyRun;if(!b||b.poisonLeft<=0)return [];
 b.poisonClock+=dt;const events=[];
 while(b.poisonClock>=1-1e-8&&b.poisonLeft>0){
  b.poisonClock-=1;b.poisonLeft--;const damage=Math.min(6,s.survival.hp);
  s.survival.hp-=damage;events.push({type:'poison-tick',damage});
  if(s.survival.hp<=0){s.status='failed';s.failureReason='defeat';s.accumulator=0;events.push({type:'failed',reason:'defeat'});break;}
 }
 return events;
}
