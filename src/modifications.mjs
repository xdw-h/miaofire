const IDS = ['pierce','ricochet','burn'];
export const MODIFICATIONS = {
  pierce: {id:'pierce', name:'穿透刃', desc:'无视目标护甲', color:'#8dd3ff'},
  ricochet: {id:'ricochet', name:'弹射', desc:'击杀后将伤害传给下一目标', color:'#f5c16c'},
  burn: {id:'burn', name:'燃烧', desc:'造成持续火焰伤害', color:'#f37b58'},
};
const validId = id => IDS.includes(id);
const weaponOf = (s,id) => s.inventory?.find(w => w.id === id);
const fail = message => ({ok:false,message});
const ok = (message, extra={}) => ({ok:true,message,...extra});
function canModify(s, weaponId) {
  if (s.challenge) return fail('挑战中不能改造武器');
  if ((s.bestEver ?? 0) < 8) return fail('通关第8关后解锁武器改造');
  const weapon = weaponOf(s, weaponId);
  if (!weapon) return fail('武器不存在');
  return weapon;
}
function ensureMods(weapon) { weapon.mods ??= {}; weapon.activeMod ??= null; return weapon; }
export function modificationLevel(weapon) {
  if (!weapon?.mods) return 0;
  return IDS.reduce((n,id) => n + Math.max(0, Math.min(3, Number(weapon.mods[id] || 0))), 0);
}
export function hasModifications(weapon) { return modificationLevel(weapon) > 0; }
export function buyModification(s, weaponId, id) {
  const checked = canModify(s, weaponId); if (checked?.ok === false) return checked;
  if (!validId(id)) return fail('未知改造');
  const weapon = ensureMods(checked), level = Number(weapon.mods[id] || 0);
  if (level > 0) return fail('该改造已购买');
  if ((s.gems ?? 0) < 20) return fail('需要20钻石');
  s.gems -= 20; weapon.mods[id] = 1; weapon.activeMod = id;
  return ok(`已解锁${MODIFICATIONS[id].name}`, {weapon});
}
export function equipModification(s, weaponId, idOrNull) {
  const checked = canModify(s, weaponId); if (checked?.ok === false) return checked;
  const weapon = ensureMods(checked);
  if (idOrNull !== null && (!validId(idOrNull) || !(weapon.mods[idOrNull] > 0))) return fail('该改造尚未购买');
  weapon.activeMod = idOrNull;
  return ok(idOrNull ? `已装备${MODIFICATIONS[idOrNull].name}` : '已卸下改造', {weapon});
}
export function upgradeModification(s, weaponId, id) {
  const checked = canModify(s, weaponId); if (checked?.ok === false) return checked;
  if (!validId(id)) return fail('未知改造');
  const weapon = ensureMods(checked), level = Number(weapon.mods[id] || 0);
  if (level < 1) return fail('请先购买改造');
  if (level >= 3) return fail('改造已达最高等级');
  const cost = level === 1 ? 8 : 16;
  if ((s.workshop?.parts ?? 0) < cost) return fail(`需要${cost}份材料`);
  s.workshop.parts -= cost; weapon.mods[id] = level + 1;
  return ok(`${MODIFICATIONS[id].name}升级至 Lv.${level + 1}`, {weapon});
}
export function dismantleModifications(s, weaponId) {
  const checked = canModify(s, weaponId); if (checked?.ok === false) return checked;
  const weapon = ensureMods(checked);
  let gems = 0, parts = 0;
  for (const id of IDS) {
    const level = Number(weapon.mods[id] || 0);
    if (level > 0) { gems += 20; parts += level === 2 ? 8 : level >= 3 ? 24 : 0; }
  }
  s.gems = (s.gems ?? 0) + gems; s.workshop ??= {parts:0}; s.workshop.parts += parts;
  weapon.mods = {}; weapon.activeMod = null;
  return ok('已拆解全部改造', {weapon, gems, parts});
}
