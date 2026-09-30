import {createGame, restartBattle, TYPES, UPGRADE_INFO, INVENTORY_LIMIT} from './game.mjs';
import {PETS,MILESTONES,progressionDefaults} from './progression.mjs';
import {defenseStats} from './survival.mjs';
import {expeditionDefaults,offerBlessing,validateExpedition} from './blessings.mjs';
import {dailyDefaults,validDate} from './daily.mjs';
import {BOUNTIES,bountyDefaults} from './bounties.mjs';
export const SAVE_KEY = 'miaofire.save.v1';
const numeric = (n, max = 1e150) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
const integer = (n, max) => numeric(n, max) && Number.isInteger(n);
const MODIFICATION_IDS = new Set(['pierce', 'ricochet', 'burn']);
const record = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function validateWeaponModifications(weapon) {
  if (Object.hasOwn(weapon, 'mods')) {
    if (!record(weapon.mods)) return false;
    for (const [id, level] of Object.entries(weapon.mods)) {
      if (!MODIFICATION_IDS.has(id) || !integer(level, 3)) return false;
    }
  }
  if (Object.hasOwn(weapon, 'activeMod')) {
    const id = weapon.activeMod;
    if (id !== null && (!MODIFICATION_IDS.has(id) || (weapon.mods?.[id] ?? 0) < 1)) return false;
  }
  return true;
}

export function validateState(s,version=6) {
  if (!s || typeof s !== 'object') return false;
  if (!['coins', 'gems', 'crystals'].every(key => numeric(s[key]))) return false;
  if (!integer(s.level, 10000) || s.level < 1 || !integer(s.bestThisRun, 10000) || !integer(s.bestEver, 10000)) return false;
  if (s.bestThisRun >= s.level || s.bestEver < s.bestThisRun) return false;
  const upgrades=Object.entries(UPGRADE_INFO).filter(([key])=>version>=3||!['health','shield'].includes(key));
  if (!s.upgrades || !upgrades.every(([key, info]) => integer(s.upgrades[key], info.cap))) return false;
  if (!Array.isArray(s.inventory) || !s.inventory.length || s.inventory.length > INVENTORY_LIMIT) return false;
  const ids = new Set();
  for (const weapon of s.inventory) {
    if (!weapon || typeof weapon.id !== 'string' || !/^w[1-9]\d*$/.test(weapon.id) || ids.has(weapon.id)) return false;
    if (!Object.hasOwn(TYPES, weapon.type) || !integer(weapon.tier, 4)) return false;
    if (version >= 6 && !validateWeaponModifications(weapon)) return false;
    ids.add(weapon.id);
  }
  if (!integer(s.nextId, Number.MAX_SAFE_INTEGER) || s.nextId <= Math.max(...s.inventory.map(w => Number(w.id.slice(1))))) return false;
  if (!Array.isArray(s.equipment) || s.equipment.length !== 3) return false;
  if (!s.equipment.every(id => id === null || ids.has(id))) return false;
  if (new Set(s.equipment.filter(Boolean)).size !== s.equipment.filter(Boolean).length) return false;
  if (!integer(s.kills, 9) || !integer(s.totalKills) || !numeric(s.elapsed, 60) || !numeric(s.hp, 1e120)) return false;
  if (!['playing', 'failed'].includes(s.status)) return false;
  if(version>=2){
    if(!integer(s.fish)||!s.pets||typeof s.pets!=='object')return false;
    if(!Object.entries(PETS).every(([id,p])=>integer(s.pets[id],20)&&(!s.pets[id]||s.bestEver>=p.unlock)))return false;
    if(s.activePet!==null&&(!Object.hasOwn(PETS,s.activePet)||!s.pets[s.activePet]))return false;
    if(!Array.isArray(s.claimedMilestones)||new Set(s.claimedMilestones).size!==s.claimedMilestones.length)return false;
    if(!s.claimedMilestones.every(id=>MILESTONES.some(m=>m.id===id&&s[m.field]>=m.target)))return false;
    if(!integer(s.challengeClears,5)||(s.challengeClears>0&&s.bestEver<3))return false;
    if(s.challenge!==null)return false;
  }
  if(version>=4&&!validateExpedition(s.expedition,s.bestThisRun))return false;
  if(version>=4&&(!s.daily||s.daily.lastClaimed!==null&&!validDate(s.daily.lastClaimed)))return false;
  if(version>=5&&(!s.endless||!integer(s.endless.bestWaves,99999)))return false;
  if(version>=6&&(!record(s.workshop)||!integer(s.workshop.parts,1e9)))return false;
  if(s.bounties!==undefined&&(!record(s.bounties)||!Array.isArray(s.bounties.cleared)||new Set(s.bounties.cleared).size!==s.bounties.cleared.length||!s.bounties.cleared.every(id=>Object.hasOwn(BOUNTIES,id))||s.bounties.cleared.length>0&&s.bestEver<10))return false;
  if(version>=3){
    const v=s.survival,d=defenseStats(s);
    if(!v||!numeric(v.hp,d.maxHp)||!numeric(v.shield,d.maxShield)||!numeric(v.bossTime,5)||!numeric(v.damageAgo,3)||!integer(v.attackCount,60)||!integer(v.enemyStrikes??0,60))return false;
    if(![null,'timeout','defeat'].includes(s.failureReason))return false;
  }
  return true;
}

export function saveGame(storage, state) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({version: 6, state:{...state, workshop: state.workshop === undefined ? {parts: 0} : state.workshop, challenge:null}}));
    return {ok: true};
  } catch {
    return {ok: false, warning: '浏览器无法保存进度。本次仍可试玩，请不要关闭页面。'};
  }
}

export function loadGame(storage) {
  let raw;
  try { raw = storage.getItem(SAVE_KEY); }
  catch { return {state: createGame(), blocked: false, warning: '浏览器未允许本地存储，本次进度无法保存。'}; }
  if (raw === null) return {state: createGame(), blocked: false, warning: ''};
  try {
    const parsed = JSON.parse(raw);
    if (![1,2,3,4,5,6].includes(parsed.version) || !validateState(parsed.state,parsed.version)) throw new Error('Invalid save');
    const state = parsed.version===1?{...parsed.state,...progressionDefaults()}:parsed.state;
    if(parsed.version<3)state.upgrades={...state.upgrades,health:0,shield:0};
    if(parsed.version<4){state.daily=dailyDefaults();state.expedition=expeditionDefaults();offerBlessing(state,Math.floor(state.bestThisRun/3)*3);}
    if(parsed.version<5)state.endless={bestWaves:0};
    if(parsed.version<6){
      state.challenge=null;
      state.workshop={parts:0};
      for(const weapon of state.inventory){delete weapon.mods;delete weapon.activeMod;}
    }
    state.bounties??=bountyDefaults();
    restartBattle(state);
    if(parsed.version<6){
      try{
        const backupKey=`${SAVE_KEY}.backup-v${parsed.version}`;
        if(storage.getItem(backupKey)===null)storage.setItem(backupKey,raw);
        storage.setItem(SAVE_KEY,JSON.stringify({version:6,state}));
      }catch{
        return {state,blocked:true,restored:true,warning:'旧进度已读取，但备份或升级保存失败。原档已保留；当前为临时试玩，请释放浏览器存储空间后刷新。'};
      }
      return {state,blocked:false,warning:'',restored:true,migrated:true};
    }
    return {state, blocked: false, warning: '', restored: true};
  } catch {
    return {state: createGame(), blocked: true,
      warning: '存档无法读取，原数据已保留。当前为临时试玩；可在设置中确认重开并恢复保存。'};
  }
}
