import {progressionDefaults,petBonus,CHALLENGES} from './progression.mjs';
import {baseHealth,enemyFor,stageReward,damageToEnemy} from './enemies.mjs';
export {stageReward,damageToEnemy} from './enemies.mjs';
export const TYPES = {
  pistol: {name: '松果手枪', short: '手枪', damage: 5, rate: 2, color: '#df9850', description: '稳定点射 · 可靠的老朋友'},
  smg: {name: '薄荷冲锋枪', short: '冲锋枪', damage: 3, rate: 3.6, color: '#57a593', description: '高速连发 · 弹幕小能手'},
  shotgun: {name: '落日霰弹枪', short: '霰弹枪', damage: 12, rate: 0.95, color: '#d98575', description: '重型散射 · 一发很有分量'},
};
export const TIERS = ['C', 'B', 'A', 'S', 'SS'];
export const UPGRADE_INFO = {
  attack: {name: '攻击力', base: 12, growth: 1.36, cap: 60},
  speed: {name: '攻击速度', base: 18, growth: 1.42, cap: 30},
  income: {name: '金币收益', base: 15, growth: 1.38, cap: 60},
};
export const INVENTORY_LIMIT = 120;
const MAX = 1e150, STEP = 1 / 120;
const fail = message => ({ok: false, message});
const ok = message => ({ok: true, message});
const bounded = n => Math.min(MAX, n);

export const treeHealth=baseHealth;
export function createGame() {
  return {
    ...progressionDefaults(),
    level: 1, bestThisRun: 0, bestEver: 0, coins: 0, gems: 30, crystals: 0,
    upgrades: {attack: 0, speed: 0, income: 0},
    inventory: [{id: 'w1', type: 'pistol', tier: 0}],
    equipment: ['w1', null, null], nextId: 2,
    kills: 0, totalKills: 0, elapsed: 0, hp: treeHealth(1),
    status: 'playing', cooldowns: [0, 0, 0], accumulator: 0,
  };
}

export function weaponPower(s, weapon) {
  const type = TYPES[weapon.type];
  const bonus=petBonus(s);
  const damage = Math.round(type.damage * 1.85 ** weapon.tier * 1.22 ** s.upgrades.attack * (1 + s.crystals * 0.1)*bonus.attack);
  const rate = type.rate * (1 + s.upgrades.speed * 0.07)*bonus.speed;
  return {damage, rate, dps: damage * rate};
}
export function stats(s) {
  const cats = s.equipment.map(id => {
    const weapon = s.inventory.find(w => w.id === id);
    return weapon ? {...weapon, ...weaponPower(s, weapon)} : null;
  });
  return {cats, dps: cats.reduce((sum, cat) => sum + (cat?.dps || 0), 0),
    income: (1 + s.upgrades.income * 0.16)*petBonus(s).income, attack: 1.22 ** s.upgrades.attack * (1 + s.crystals * 0.1)*petBonus(s).attack,
    speed: (1 + s.upgrades.speed * 0.07)*petBonus(s).speed};
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
  return ok(`${info.name}升至 Lv.${s.upgrades[kind]}`);
}
function randomType(random) {
  return Object.keys(TYPES)[Math.min(2, Math.max(0, Math.floor(random() * 3)))];
}
export function drawWeapon(s, random = Math.random) {
  if(s.challenge)return fail('挑战中不能抽取武器');
  if (s.gems < 10) return fail('需要 10 钻石，通关就能获得');
  if (s.inventory.length >= INVENTORY_LIMIT) return fail('背包已满，请先合成武器');
  const weapon = {id: `w${s.nextId++}`, type: randomType(random), tier: 0};
  s.gems -= 10; s.inventory.push(weapon);
  return {...ok(`获得 ${TYPES[weapon.type].name} · C 级`), weapon};
}
export function equipWeapon(s, id, slot) {
  if(s.challenge)return fail('挑战中不能更换装备');
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) return fail('出战位置无效');
  if (!s.inventory.some(w => w.id === id)) return fail('武器不存在');
  if (s.equipment.includes(id)) return fail('这把武器已经出战了');
  s.equipment[slot] = id; s.cooldowns[slot] = 0;
  return ok(`第 ${slot + 1} 只猫咪准备就绪`);
}
export function unequipWeapon(s, slot) {
  if(s.challenge)return fail('挑战中不能更换装备');
  if (!Number.isInteger(slot) || slot < 0 || slot > 2 || !s.equipment[slot]) return fail('这里没有装备');
  s.equipment[slot] = null; s.cooldowns[slot] = 0;
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
}
export function rebirth(s) {
  if(s.challenge)return fail('请先结束挑战再转生');
  const reward = rebirthReward(s);
  if (reward <= 0) return fail('通过第 3 关后，即可转生');
  s.crystals = bounded(s.crystals + reward);
  s.coins = 0; s.upgrades = {attack: 0, speed: 0, income: 0};
  s.level = 1; s.bestThisRun = 0;
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
  if(s.challenge)return fail('已有挑战进行中');
  if(s.bestEver<3)return fail('通过第 3 关后开放挑战');
  if(!Number.isInteger(tier)||!CHALLENGES[tier]||tier>s.challengeClears)return fail('请先通过上一档挑战');
  if(!s.equipment.some(Boolean))return fail('请先装备至少一把武器');
  s.challenge={tier,hp:CHALLENGES[tier].hp,elapsed:0,cooldowns:[0,0,0],accumulator:0,status:'playing',reward:0};
  return ok(`开始${CHALLENGES[tier].name}，限时 30 秒`);
}
export function exitChallenge(s){if(!s.challenge)return fail('没有正在进行的挑战');s.challenge=null;return ok('已返回主线，继续之前的冒险');}
export function targetId(s){return s.challenge?`challenge-${s.challenge.tier}`:`tree-${s.totalKills}`;}
export function battleState(s){return s.challenge||s;}
export function currentEnemy(s){return s.challenge?{kind:'dummy',name:'训练木偶',label:'精英目标',level:s.level,armor:0,coinMultiplier:0,hp:CHALLENGES[s.challenge.tier].hp}:enemyFor(s.level,s.kills);}
export function targetHealth(s){return currentEnemy(s).hp;}

// Fixed simulation steps make gameplay identical on 30/60/120 Hz displays.
export function advance(s, delta) {
  const events = [];
  const battle=battleState(s),limit=s.challenge?30:60;
  if (battle.status !== 'playing' || !Number.isFinite(delta) || delta <= 0) return events;
  battle.accumulator += Math.min(delta, 0.25);
  const current = stats(s);
  while (battle.accumulator + 1e-9 >= STEP && battle.status === 'playing') {
    battle.accumulator = Math.max(0, battle.accumulator - STEP);
    battle.elapsed += STEP;
    if (battle.elapsed + 1e-8 >= limit) {
      battle.status = 'failed'; battle.elapsed = limit; battle.accumulator = 0;
      events.push(s.challenge?{type:'challenge-result',won:false,reward:0}:{type: 'failed'}); break;
    }
    for (let slot = 0; slot < 3; slot++) {
      const cat = current.cats[slot];
      if (!cat) continue;
      battle.cooldowns[slot] -= STEP;
      if (battle.cooldowns[slot] > 1e-9) continue;
      battle.cooldowns[slot] += 1 / cat.rate;
      const enemy=currentEnemy(s),damage=damageToEnemy(cat.damage,enemy);
      battle.hp = Math.max(0, battle.hp - damage);
      const id=targetId(s);
      events.push({type:'shot',slot,gun:cat.type,damage,armored:enemy.armor>0,targetId:id,targetLevel:s.level,targetEnemy:enemy});
      if (battle.hp > 0) continue;
      if(s.challenge){
        const reward=challengeReward(s,battle.tier);s.fish=bounded(s.fish+reward);
        s.challengeClears=Math.max(s.challengeClears,battle.tier+1);battle.reward=reward;battle.status='won';battle.accumulator=0;
        events.push({type:'kill',coins:0,targetId:id,nextTargetId:null});
        events.push({type:'challenge-result',won:true,reward});break;
      }
      const coins = Math.round((4 + Math.floor(s.level * 1.6)) * current.income*enemy.coinMultiplier);
      s.coins = bounded(s.coins + coins); s.kills++; s.totalKills++;
      const nextLevel=s.kills>=10?s.level+1:s.level,nextKills=s.kills>=10?0:s.kills;
      events.push({type:'kill',coins,targetId:id,nextTargetId:targetId(s),nextLevel,nextEnemy:enemyFor(nextLevel,nextKills),enemyKind:enemy.kind});
      if (s.kills >= 10) {
        s.bestThisRun = s.level; s.bestEver = Math.max(s.bestEver, s.level);
        const reward=stageReward(s.level);
        s.gems = bounded(s.gems + reward.gems);s.fish=bounded(s.fish+reward.fish); s.level++; s.kills = 0; s.elapsed = 0;
        events.push({type:'level',level:s.level,boss:enemy.kind==='boss',reward});
      }
      s.hp = targetHealth(s);
    }
  }
  return events;
}
