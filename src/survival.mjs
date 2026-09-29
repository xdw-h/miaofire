export const BOSS_CYCLE=5, BOSS_WINDUP=2, SHIELD_DELAY=3, SHIELD_REGEN=8;
export function defenseStats(s){return {maxHp:100+20*s.upgrades.health,maxShield:60+15*s.upgrades.shield};}
export function resetSurvival(s){const d=defenseStats(s);s.survival={hp:d.maxHp,shield:d.maxShield,bossTime:0,damageAgo:SHIELD_DELAY,attackCount:0};s.failureReason=null;}
export function bossDamage(level){return 40+8*Math.max(0,Math.floor(level/5)-1);}
export function bossCharging(s){return !s.challenge&&s.status==='playing'&&s.level%5===0&&s.kills===9&&s.survival.bossTime>=BOSS_CYCLE-BOSS_WINDUP-1e-8;}

// Called only after friendly shots; a defeated boss never lands a pending strike.
export function advanceSurvival(s,dt){
 const v=s.survival,events=[],d=defenseStats(s);
 const recovery=Math.max(0,dt-Math.max(0,SHIELD_DELAY-v.damageAgo));
 v.damageAgo=Math.min(SHIELD_DELAY,v.damageAgo+dt);
 v.shield=Math.min(d.maxShield,v.shield+SHIELD_REGEN*recovery);
 if(s.level%5!==0||s.kills!==9){v.bossTime=0;return events;}
 const before=v.bossTime;v.bossTime+=dt;
 if(before<BOSS_CYCLE-BOSS_WINDUP-1e-8&&v.bossTime>=BOSS_CYCLE-BOSS_WINDUP-1e-8)events.push({type:'boss-charge',damage:bossDamage(s.level)});
 if(v.bossTime<BOSS_CYCLE-1e-8)return events;
 v.bossTime=0;v.attackCount++;v.damageAgo=0;
 const damage=bossDamage(s.level),shieldDamage=Math.min(v.shield,damage),healthDamage=Math.min(v.hp,damage-shieldDamage);
 const shieldBroken=v.shield>0&&damage>=v.shield;
 v.shield=Math.max(0,v.shield-shieldDamage);v.hp=Math.max(0,v.hp-healthDamage);
 events.push({type:'boss-strike',damage,shieldDamage,healthDamage,shieldBroken});
 if(v.hp<=1e-8){v.hp=0;s.status='failed';s.failureReason='defeat';s.accumulator=0;events.push({type:'failed',reason:'defeat'});}
 return events;
}
