import {enemyFor} from './enemies.mjs';
export const BOSS_CYCLE=5, BOSS_WINDUP=2, SHIELD_DELAY=3, SHIELD_REGEN=8;
export function defenseStats(s){return {maxHp:100+20*s.upgrades.health,maxShield:60+15*s.upgrades.shield};}
export function resetSurvival(s){const d=defenseStats(s);s.survival={hp:d.maxHp,shield:d.maxShield,bossTime:0,enemyStrikes:0,damageAgo:SHIELD_DELAY,attackCount:0};s.failureReason=null;}
// Retain bossTime in v3 saves; it now tracks the current enemy's attack clock.
export function resetEnemyAttack(s){s.survival.bossTime=0;s.survival.enemyStrikes=0;}
export function bossDamage(level){return 40+8*Math.max(0,Math.floor(level/5)-1);}
export function enemyAttack(s){
 if(s.challenge)return null;
 const enemy=enemyFor(s.level,s.kills),boss=enemy.kind==='boss';
 return {enemy,boss,cycle:boss?BOSS_CYCLE:s.survival.enemyStrikes?4:1,windup:boss?BOSS_WINDUP:1,
  damage:boss?bossDamage(s.level):4+2*Math.floor((s.level-1)/5)+(enemy.kind==='armored'?4:0)};
}
export function enemyCharging(s){const a=enemyAttack(s);return !!a&&s.status==='playing'&&s.survival.bossTime>=a.cycle-a.windup-1e-8;}
export function bossCharging(s){return enemyAttack(s)?.boss===true&&enemyCharging(s);}

// Called only after friendly shots; a defeated enemy never lands a pending strike.
export function advanceSurvival(s,dt){
 if(s.challenge||s.status!=='playing')return [];
 const v=s.survival,events=[],d=defenseStats(s);
 const recovery=Math.max(0,dt-Math.max(0,SHIELD_DELAY-v.damageAgo));
 v.damageAgo=Math.min(SHIELD_DELAY,v.damageAgo+dt);
 v.shield=Math.min(d.maxShield,v.shield+SHIELD_REGEN*recovery);
 const attack=enemyAttack(s),{cycle,windup,damage,enemy,boss}=attack;
 const before=v.bossTime;v.bossTime+=dt;
 if((before<cycle-windup-1e-8||before===0&&cycle===windup)&&v.bossTime>=cycle-windup-1e-8)events.push({type:boss?'boss-charge':'enemy-charge',damage});
 if(v.bossTime<cycle-1e-8)return events;
 v.bossTime=0;v.attackCount++;v.enemyStrikes=(v.enemyStrikes??0)+1;v.damageAgo=0;
 const shieldDamage=Math.min(v.shield,damage),healthDamage=Math.min(v.hp,damage-shieldDamage);
 const shieldBroken=v.shield>0&&damage>=v.shield;
 v.shield=Math.max(0,v.shield-shieldDamage);v.hp=Math.max(0,v.hp-healthDamage);
 events.push({type:boss?'boss-strike':'enemy-strike',targetId:`tree-${s.totalKills}`,enemyKind:enemy.kind,enemyName:enemy.name,damage,shieldDamage,healthDamage,shieldBroken});
 if(v.hp<=1e-8){v.hp=0;s.status='failed';s.failureReason='defeat';s.accumulator=0;events.push({type:'failed',reason:'defeat'});}
 return events;
}
