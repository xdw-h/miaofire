import {progressionDefaults,petBonus,CHALLENGES} from './progression.mjs';
import {baseHealth,enemyFor,stageReward,damageToEnemy,encounterFor} from './enemies.mjs';
export {stageReward,damageToEnemy} from './enemies.mjs';
import {resetSurvival,resetEnemyAttack,advanceSurvival,defenseStats} from './survival.mjs';
import {TYPES,resolveWeaponShot,wardCharge} from './weapons.mjs';
import {expeditionDefaults,blessingCount,offerBlessing} from './blessings.mjs';
export {chooseBlessing} from './blessings.mjs';
import {activeLinks,combatDefaults,clearLinks,syncEncounter,tickCombat,linkShot} from './combat-effects.mjs';
import {SKILLS,skillDefaults,tickSkills} from './skills.mjs';
import {dailyDefaults,dailyInfo,dailyAvailable,DAILY_RULES} from './daily.mjs';
export {TYPES} from './weapons.mjs';
export {defenseStats} from './survival.mjs';
export const TIERS = ['C', 'B', 'A', 'S', 'SS'];
export const UPGRADE_INFO = {
  attack: {name: '攻击力', base: 12, growth: 1.36, cap: 60},
  speed: {name: '攻击速度', base: 18, growth: 1.42, cap: 30},
  income: {name: '金币收益', base: 15, growth: 1.38, cap: 60},
  health: {name:'生命强化',base:25,growth:1.38,cap:30},
  shield: {name:'护盾强化',base:30,growth:1.4,cap:30},
};
export const INVENTORY_LIMIT = 120;
const MAX = 1e150, STEP = 1 / 120;
const fail = message => ({ok: false, message});
const ok = message => ({ok: true, message});
const bounded = n => Math.min(MAX, n);

export const treeHealth=baseHealth;
export function createGame() {
  const s = {
    ...progressionDefaults(),
    daily:dailyDefaults(),
    expedition:expeditionDefaults(),combat:combatDefaults(),skills:skillDefaults(),
    level: 1, bestThisRun: 0, bestEver: 0, coins: 0, gems: 30, crystals: 0,
    upgrades: {attack: 0, speed: 0, income: 0,health:0,shield:0},
    inventory: [{id: 'w1', type: 'pistol', tier: 0}],
    equipment: ['w1', null, null], nextId: 2,
    kills: 0, totalKills: 0, elapsed: 0, hp: treeHealth(1),
    status: 'playing', cooldowns: [0, 0, 0], accumulator: 0,
  };
  resetSurvival(s);return s;
}

export function weaponPower(s, weapon) {
  const type = TYPES[weapon.type];
  const bonus=petBonus(s);
  const damage = Math.round(type.damage * 1.85 ** weapon.tier * 1.22 ** s.upgrades.attack * (1 + s.crystals * 0.1)*bonus.attack*(1+.08*blessingCount(s,'attack')));
  const rate = type.rate * (1 + s.upgrades.speed * 0.07)*bonus.speed*(1+.05*blessingCount(s,'speed'))*(s.equipment.includes(weapon.id)&&['pistol','smg'].includes(weapon.type)&&activeLinks(s).some(l=>l.id==='rapid')?1.08:1);
  return {damage, rate, dps: damage * rate};
}
export function stats(s) {
  if(s.challenge?.kind==='daily')return stats(s.challenge.run);
  const cats = s.equipment.map(id => {
    const weapon = s.inventory.find(w => w.id === id);
    return weapon ? {...weapon, ...weaponPower(s, weapon)} : null;
  });
  return {cats, dps: cats.reduce((sum, cat) => sum + (cat?.dps || 0), 0),
    income: (1 + s.upgrades.income * 0.16)*petBonus(s).income, attack: 1.22 ** s.upgrades.attack * (1 + s.crystals * 0.1)*petBonus(s).attack*(1+.08*blessingCount(s,'attack')),
    speed: (1 + s.upgrades.speed * 0.07)*petBonus(s).speed*(1+.05*blessingCount(s,'speed'))};
}
export function upgradeCost(s, kind) {
  const info = UPGRADE_INFO[kind];
  return info ? Math.ceil(info.base * info.growth ** s.upgrades[kind]) : Infinity;
}
export function upgrade(s, kind) {
  if(s.challenge)return fail('挑战中不能升级，请先返回主线');
  const info = UPGRADE_INFO[kind];
  if (!info) return fail('没有这项升级');
  if (s.upgrades[kind] >= info.cap) return fail('已达到最高等级');
  const cost = upgradeCost(s, kind);
  if (s.coins < cost) return fail('金币还不够，再击败几个敌人吧');
  s.coins -= cost; s.upgrades[kind]++;
  if(kind==='health')s.survival.hp+=20;
  if(kind==='shield')s.survival.shield+=15;
  return ok(`${info.name}升至 Lv.${s.upgrades[kind]}`);
}
function randomType(random) {
  const types=Object.keys(TYPES);
  return types[Math.min(types.length-1, Math.max(0, Math.floor(random() * types.length)))];
}
export function drawWeapon(s, random = Math.random) {
  if(s.challenge)return fail('挑战中不能抽取武器');
  if (s.gems < 10) return fail('需要 10 钻石，通关就能获得');
  if (s.inventory.length >= INVENTORY_LIMIT) return fail('背包已满，请先合成武器');
  const weapon = {id: `w${s.nextId++}`, type: randomType(random), tier: 0};
  s.gems -= 10; s.inventory.push(weapon);
  return {...ok(`获得 ${TYPES[weapon.type].name} · C 级`), weapon};
}
export function orderWeapon(s,type){
  if(s.challenge)return fail('挑战中不能领取定向补给');
  if(!Object.hasOwn(TYPES,type))return fail('没有这类武器');
  if(s.gems<20)return fail('定向补给需要 20 钻石');
  if(s.inventory.length>=INVENTORY_LIMIT)return fail('背包已满，请先合成武器');
  const weapon={id:`w${s.nextId++}`,type,tier:0};s.gems-=20;s.inventory.push(weapon);
  return {...ok(`定向获得 ${TYPES[type].name} · C 级`),weapon};
}
export function equipWeapon(s, id, slot) {
  if(s.challenge)return fail('挑战中不能更换装备');
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) return fail('出战位置无效');
  if (!s.inventory.some(w => w.id === id)) return fail('武器不存在');
  if (s.equipment.includes(id)) return fail('这把武器已经出战了');
  s.equipment[slot] = id; s.cooldowns[slot] = 0;
  clearLinks(s);
  return ok(`第 ${slot + 1} 只猫咪准备就绪`);
}
export function unequipWeapon(s, slot) {
  if(s.challenge)return fail('挑战中不能更换装备');
  if (!Number.isInteger(slot) || slot < 0 || slot > 2 || !s.equipment[slot]) return fail('这里没有装备');
  s.equipment[slot] = null; s.cooldowns[slot] = 0;
  clearLinks(s);
  return ok('武器已放回背包');
}
export function mergeWeapons(s, first, second, random = Math.random) {
  if(s.challenge)return fail('挑战中不能合成武器');
  if (first === second) return fail('合成需要两把不同的武器');
  const a = s.inventory.find(w => w.id === first), b = s.inventory.find(w => w.id === second);
  if (!a || !b) return fail('合成材料不存在');
  if (s.equipment.includes(first) || s.equipment.includes(second)) return fail('请先卸下要合成的武器');
  if (a.type !== b.type || a.tier !== b.tier) return fail('需要同类型、同等级的两把武器');
  if (a.tier >= TIERS.length - 1) return fail('SS 已是最高等级');
  const weapon = {id: `w${s.nextId++}`, type: randomType(random), tier: a.tier + 1};
  s.inventory = s.inventory.filter(w => w.id !== first && w.id !== second);
  s.inventory.push(weapon);
  return {...ok(`合成成功！${TIERS[weapon.tier]} 级 ${TYPES[weapon.type].name}`), weapon};
}
export function rebirthReward(s) { return Math.floor(s.bestThisRun / 3); }
export function restartBattle(s) {
  s.kills = 0; s.elapsed = 0; s.hp = treeHealth(s.level);
  s.status = 'playing'; s.cooldowns = [0, 0, 0]; s.accumulator = 0;
  resetSurvival(s);
  s.combat=combatDefaults();
  s.skills=skillDefaults();
}
export function rebirth(s) {
  if(s.challenge)return fail('请先结束挑战再转生');
  const reward = rebirthReward(s);
  if (reward <= 0) return fail('通过第 3 关后，即可转生');
  s.crystals = bounded(s.crystals + reward);
  s.coins = 0; s.upgrades = {attack: 0, speed: 0, income: 0,health:0,shield:0};
  s.level = 1; s.bestThisRun = 0;
  s.expedition=expeditionDefaults();
  restartBattle(s);
  return {...ok(`转生成功，获得 ${reward} 颗紫晶`), reward};
}
export function retry(s) {
  if(s.challenge)return fail('请先结束挑战');
  if (s.status !== 'failed') return fail('正在挑战中');
  restartBattle(s);
  return ok('重新出发！');
}

export function challengeReward(s,tier){const c=CHALLENGES[tier];return c?(tier<s.challengeClears?c.repeat:c.first):0;}
export function startChallenge(s,tier){
  if(s.expedition?.pending)return fail('请先选择远征祝福');
  if(s.challenge)return fail('已有挑战进行中');
  if(s.bestEver<3)return fail('通过第 3 关后开放挑战');
  if(!Number.isInteger(tier)||!CHALLENGES[tier]||tier>s.challengeClears)return fail('请先通过上一档挑战');
  if(!s.equipment.some(Boolean))return fail('请先装备至少一把武器');
  s.challenge={tier,hp:CHALLENGES[tier].hp,elapsed:0,cooldowns:[0,0,0],accumulator:0,status:'playing',reward:0,combat:combatDefaults(),skills:skillDefaults()};
  return ok(`开始${CHALLENGES[tier].name}，限时 30 秒`);
}
export function exitChallenge(s){if(!s.challenge)return fail('没有正在进行的挑战');s.challenge=null;return ok('已返回主线，继续之前的冒险');}
export function startDaily(s,date=new Date()){
  if(s.challenge)return fail('已有挑战进行中');
  if(s.expedition.pending)return fail('请先选择远征祝福');
  if(s.bestEver<3)return fail('通过第 3 关后开放每日挑战');
  const info=dailyInfo(date);if(!info)return fail('无法识别本机日期');
  const run=createGame();run.level=info.rule==='bossrush'?11:10;run.bestEver=run.level-1;run.bestThisRun=run.level-1;run.dailyRule=info.rule;
  run.inventory=info.types.map((type,i)=>({id:`w${i+1}`,type,tier:1}));run.equipment=[0,1,2].map(i=>run.inventory[i]?.id||null);run.nextId=run.inventory.length+1;
  run.upgrades={attack:info.rule==='duo'?4:3,speed:2,income:0,health:3,shield:3};restartBattle(run);run.hp=targetHealth(run);
  s.challenge={kind:'daily',date:info.date,rule:info.rule,target:info.target,run,status:'playing',reward:0,gemsReward:0};
  return ok(`开始每日挑战：${info.name}`);
}
export function targetId(s){return s.challenge?.kind==='daily'?targetId(s.challenge.run):s.challenge?`challenge-${s.challenge.tier}`:`${s.dailyRule?'daily':'tree'}-${s.totalKills}`;}
export function battleState(s){return s.challenge?.kind==='daily'?s.challenge.run:s.challenge||s;}
export function currentEnemy(s){return s.challenge?.kind==='daily'?currentEnemy(s.challenge.run):s.challenge?{kind:'dummy',name:'训练木偶',label:'精英目标',level:s.level,armor:0,coinMultiplier:0,hp:CHALLENGES[s.challenge.tier].hp}:encounterFor(s);}
export function targetHealth(s){return currentEnemy(s).hp;}
export function castSkill(s,id){
  if(s.challenge?.kind==='daily')return castSkill(s.challenge.run,id);
  const b=battleState(s),skill=SKILLS[id];
  if(!Object.hasOwn(SKILLS,id)||b.status!=='playing'||!s.challenge&&s.expedition?.pending)return fail('当前无法释放技能');
  if(b.skills.cooldowns[id]>1e-8)return fail('技能正在冷却');
  if(id!=='burst'&&s.challenge)return fail('训练木偶不反击，无需恢复防线');
  const d=defenseStats(s),v=s.survival;
  if(id==='shield'&&v.shield>=d.maxShield||id==='heal'&&v.hp>=d.maxHp)return fail('当前已是满状态');
  if(id==='shield')v.shield=Math.min(d.maxShield,v.shield+d.maxShield*.5);
  if(id==='heal')v.hp=Math.min(d.maxHp,v.hp+d.maxHp*.25);
  if(id==='burst')b.skills.burst=5;
  b.skills.cooldowns[id]=skill.cooldown;return ok(`${skill.name}已释放`);
}

// Fixed simulation steps make gameplay identical on 30/60/120 Hz displays.
export function advance(s, delta) {
  if(s.challenge?.kind==='daily'){
    const ch=s.challenge;if(ch.status!=='playing')return [];
    const events=advance(ch.run,delta);ch.status=ch.run.status;
    if(ch.status==='won'||ch.status==='failed'){
      if(ch.status==='won'&&dailyAvailable(s,ch.date)){ch.reward=40;ch.gemsReward=20;s.fish=bounded(s.fish+40);s.gems=bounded(s.gems+20);s.daily.lastClaimed=ch.date;}
      events.push({type:'challenge-result',won:ch.status==='won',reward:ch.reward,gemsReward:ch.gemsReward});
    }
    return events;
  }
  const events = [];
  const battle=battleState(s),limit=s.challenge?30:60;
  if (battle.status !== 'playing' || !s.challenge&&s.expedition?.pending || !Number.isFinite(delta) || delta <= 0) return events;
  battle.accumulator += Math.min(delta, 0.25);
  const current = stats(s);
  while (battle.accumulator + 1e-9 >= STEP && battle.status === 'playing') {
    battle.accumulator = Math.max(0, battle.accumulator - STEP);
    battle.elapsed += STEP;
    if (battle.elapsed + 1e-8 >= limit) {
      battle.status = 'failed'; battle.elapsed = limit; battle.accumulator = 0;
      if(!s.challenge)s.failureReason='timeout';
      events.push(s.challenge?{type:'challenge-result',won:false,reward:0}:{type:'failed',reason:'timeout'}); break;
    }
    syncEncounter(battle,targetId(s),currentEnemy(s));
    tickSkills(battle,STEP);
    const healed=tickCombat(battle,STEP,currentEnemy(s));
    if(healed)events.push({type:'enemy-heal',amount:healed,targetId:targetId(s)});
    for (let slot = 0; slot < 3; slot++) {
      const cat = current.cats[slot];
      if (!cat) continue;
      battle.cooldowns[slot] -= STEP;
      if (battle.cooldowns[slot] > 1e-9) continue;
      battle.cooldowns[slot] += 1 / cat.rate;
      const enemy=currentEnemy(s);
      const boost=(enemy.kind==='boss'?1+.12*blessingCount(s,'hunter'):1)*(!s.challenge&&s.survival.hp<=defenseStats(s).maxHp*.35?1+.2*blessingCount(s,'courage'):1);
      syncEncounter(battle,targetId(s),enemy);
      const link=linkShot(s,battle,cat);
      const shot=resolveWeaponShot({...cat,damage:cat.damage*boost*link.multiplier*(battle.skills.burst>0?1.6:1)},enemy,battle.hp),{damage}=shot;
      shot.link=link.label;shot.enemyShieldDamage=Math.min(battle.combat.enemyShield,damage);battle.combat.enemyShield-=shot.enemyShieldDamage;
      let shieldRestored=0;
      if(cat.type==='ward'&&!s.challenge&&s.dailyRule!=='drought'){
        shieldRestored=Math.min(wardCharge(cat.tier),defenseStats(s).maxShield-s.survival.shield);
        s.survival.shield+=shieldRestored;
      }
      battle.hp = Math.max(0, battle.hp - (damage-shot.enemyShieldDamage));
      const id=targetId(s);
      events.push({type:'shot',slot,gun:cat.type,...shot,shieldRestored,targetId:id,targetLevel:s.level,targetEnemy:enemy});
      if (battle.hp > 0) continue;
      if(s.challenge){
        const reward=challengeReward(s,battle.tier);s.fish=bounded(s.fish+reward);
        s.challengeClears=Math.max(s.challengeClears,battle.tier+1);battle.reward=reward;battle.status='won';battle.accumulator=0;
        events.push({type:'kill',coins:0,targetId:id,nextTargetId:null});
        events.push({type:'challenge-result',won:true,reward});break;
      }
      if(s.dailyRule){
        s.kills++;s.totalKills++;
        const finished=s.kills>=DAILY_RULES[s.dailyRule].target;
        events.push({type:'kill',coins:0,targetId:id,nextTargetId:finished?null:targetId(s),nextLevel:s.level,nextEnemy:currentEnemy(s),enemyKind:enemy.kind});
        if(finished){s.status='won';s.accumulator=0;break;}
        s.hp=targetHealth(s);resetEnemyAttack(s);syncEncounter(s,targetId(s),currentEnemy(s));continue;
      }
      const coins = Math.round((4 + Math.floor(s.level * 1.6)) * current.income*enemy.coinMultiplier);
      s.coins = bounded(s.coins + coins); s.kills++; s.totalKills++;
      s.survival.shield=Math.min(defenseStats(s).maxShield,s.survival.shield+6*blessingCount(s,'harvest'));
      const nextLevel=s.kills>=10?s.level+1:s.level,nextKills=s.kills>=10?0:s.kills;
      events.push({type:'kill',coins,targetId:id,nextTargetId:targetId(s),nextLevel,nextEnemy:enemyFor(nextLevel,nextKills),enemyKind:enemy.kind});
      if (s.kills >= 10) {
        s.bestThisRun = s.level; s.bestEver = Math.max(s.bestEver, s.level);
        const reward=stageReward(s.level);
        s.gems = bounded(s.gems + reward.gems);s.fish=bounded(s.fish+reward.fish); s.level++; s.kills = 0; s.elapsed = 0;
        resetSurvival(s);
        clearLinks(s);
        events.push({type:'level',level:s.level,boss:enemy.kind==='boss',reward});
        if(offerBlessing(s,s.level-1))events.push({type:'blessing'});
      }
      s.hp = targetHealth(s);resetEnemyAttack(s);
      syncEncounter(s,targetId(s),currentEnemy(s));
      if(s.expedition.pending)break;
    }
    if(!s.challenge&&s.expedition.pending)break;
    if(!s.challenge&&s.status==='playing')events.push(...advanceSurvival(s,STEP));
  }
  return events;
}
