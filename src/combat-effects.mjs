export const LINKS=[
 {id:'mark',name:'猎手印记',types:['crossbow','sniper'],desc:'穿甲弩标记 4 秒，狙击命中标记伤害 +30%'},
 {id:'charge',name:'星火蓄能',types:['ward','rocket'],desc:'护盾枪每发积累 1 层，火箭消耗蓄能，每层伤害 +10%，最多 3 层'},
 {id:'rapid',name:'交叉火力',types:['pistol','smg'],desc:'手枪与冲锋枪射速 +8%'},
];
export function activeLinks(s){const types=s.equipment.map(id=>s.inventory.find(w=>w.id===id)?.type);return LINKS.filter(l=>l.types.every(t=>types.includes(t)));}
export const combatDefaults=()=>({target:null,markTime:0,charge:0,enemyShield:0,regenClock:0,burns:[],ricochetDamage:0,ricochetSource:null,pendingEvents:[]});
export function clearLinks(b){if(b.combat){b.combat.markTime=0;b.combat.charge=0;}}
export function syncEncounter(b,id,enemy){
 b.combat??=combatDefaults();const c=b.combat;
 if(c.target===id)return c;
 c.target=id;c.markTime=0;c.regenClock=0;c.enemyShield=enemy.elite==='barrier'?Math.ceil(enemy.hp*.25):0;c.burns=[];return c;
}
export function tickCombat(b,dt,enemy){
 const c=b.combat;c.pendingEvents=[];c.markTime=Math.max(0,c.markTime-dt);c.regenClock+=dt;
 let healed=0;
 if(enemy.elite==='regen'&&c.regenClock>=2-1e-8){c.regenClock=0;healed=Math.min(enemy.hp-b.hp,Math.ceil(enemy.hp*.08));b.hp+=healed;}
 for (const burn of c.burns ?? []) {
   burn.time += dt;
   while (burn.time >= .5-1e-8 && burn.remaining > 1e-8) {
     burn.time -= .5; burn.remaining -= .5;
     const raw = Math.max(1, burn.damage);
     const dealt = Math.max(1, Math.floor(raw * (1-(enemy.armor||0))));
     const shieldDamage = Math.min(c.enemyShield, dealt); c.enemyShield -= shieldDamage;
     const damage = dealt - shieldDamage; b.hp = Math.max(0, b.hp - damage);
     c.pendingEvents.push({type:'burn-tick',damage,targetId:c.target,targetLevel:enemy.level,targetEnemy:enemy,enemyShieldDamage:shieldDamage,rawDamage:raw});
   }
 }
 c.burns = (c.burns ?? []).filter(x=>x.remaining>1e-8);
 return healed;
}
export function linkShot(s,b,cat){
 const links=activeLinks(s),c=b.combat;let multiplier=1,label='';
 if(links.some(l=>l.id==='mark')){
  if(cat.type==='sniper'&&c.markTime>1e-8){multiplier*=1.3;label='猎手印记';}
  if(cat.type==='crossbow')c.markTime=4;
 }
 if(links.some(l=>l.id==='charge')){
  if(cat.type==='ward')c.charge=Math.min(3,c.charge+1);
  if(cat.type==='rocket'&&c.charge){multiplier*=1+.1*c.charge;label=`蓄能 ×${c.charge}`;c.charge=0;}
 }
 return{multiplier,label};
}
