import {MODIFICATIONS, modificationLevel} from './modifications.mjs';

/** Actions consumed by the app event handler. Keep these values stable. */
export const MODIFICATION_ACTIONS = Object.freeze({
  buy: 'mod-buy',
  upgrade: 'mod-upgrade',
  equip: 'mod-equip',
  dismantle: 'mod-dismantle',
});

const MOD_IDS = Object.keys(MODIFICATIONS);
const LEVELS = Object.freeze({
  pierce: ['无视目标 50% 护甲', '无视目标 75% 护甲', '无视目标 100% 护甲'],
  ricochet: ['预留原始伤害 25% 给下一目标', '预留原始伤害 35% 给下一目标', '预留原始伤害 45% 给下一目标'],
  burn: ['灼伤 3 秒 · 每次造成原始伤害 8%', '灼伤 3 秒 · 每次造成原始伤害 12%', '灼伤 3 秒 · 每次造成原始伤害 16%'],
});

const entity = value => value == null ? '' : String(value);

/** Escape text before inserting it into an HTML text node or attribute. */
export function escapeHtml(value) {
  return entity(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

/** Return escaped, non-empty text for safe user-facing labels. */
export function safeText(value, fallback = '-') {
  const text = entity(value).trim();
  return escapeHtml(text || fallback);
}

const number = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const weaponIdOf = weapon => weapon && weapon.id != null ? entity(weapon.id) : '';

/** Resolve either a weapon object or an inventory id for callers integrating the panel. */
export function resolveModificationWeapon(state, weaponOrId) {
  if (weaponOrId && typeof weaponOrId === 'object') return weaponOrId;
  const id = entity(weaponOrId);
  const inventory = Array.isArray(state?.inventory) ? state.inventory : [];
  return inventory.find(weapon => entity(weapon?.id) === id) || null;
}

/** Return the currently equipped modification label, or the explicit empty-state label. */
export function modificationSummary(weapon) {
  const id = weapon?.activeMod;
  return id && MODIFICATIONS[id] && number(weapon?.mods?.[id]) > 0
    ? MODIFICATIONS[id].name
    : '未启用';
}

/** Calculate the full refund shown before dismantling a weapon's modifications. */
export function modificationRefund(weapon) {
  let gems = 0;
  let parts = 0;
  for (const id of MOD_IDS) {
    const level = Math.min(3, number(weapon?.mods?.[id]));
    if (level > 0) gems += 20;
    if (level === 2) parts += 8;
    if (level >= 3) parts += 24;
  }
  return {gems, parts};
}

/** Return a stable view model so rendering never has to trust persisted values. */
export function modificationViewModel(state = {}, weaponOrId) {
  const source = state && typeof state === 'object' ? state : {};
  const weapon = resolveModificationWeapon(source, weaponOrId);
  const bestEver = number(source.bestEver);
  const gems = number(source.gems);
  const parts = number(source.workshop?.parts);
  const locked = bestEver < 8;
  const challenged = !!source.challenge;
  const reason = !weapon
    ? '武器不存在'
    : challenged
      ? '挑战中暂不可改造'
      : locked
        ? '通过第 8 关后解锁武器改造'
        : '';
  const mods = MOD_IDS.map(id => {
    const level = Math.min(3, number(weapon?.mods?.[id]));
    const upgradeCost = level === 1 ? 8 : level === 2 ? 16 : 0;
    const purchased = level > 0;
    const active = purchased && weapon?.activeMod === id;
    const action = !purchased ? MODIFICATION_ACTIONS.buy : MODIFICATION_ACTIONS.upgrade;
    let actionReason = reason;
    if (!actionReason && !purchased && gems < 20) actionReason = `还差 ${20 - gems} 钻石`;
    if (!actionReason && purchased && level < 3 && parts < upgradeCost) actionReason = `还差 ${upgradeCost - parts} 份材料`;
    return {
      ...MODIFICATIONS[id],
      id,
      level,
      purchased,
      active,
      upgradeCost,
      levelDescription: LEVELS[id]?.[Math.max(0, level - 1)] || MODIFICATIONS[id].desc,
      nextDescription: LEVELS[id]?.[level] || MODIFICATIONS[id].desc,
      action,
      actionReason,
      buyDisabled: !!actionReason || purchased,
      upgradeDisabled: !!actionReason || !purchased || level >= 3,
    };
  });
  return {
    state: source,
    weapon,
    weaponId: weaponIdOf(weapon),
    bestEver,
    gems,
    parts,
    locked,
    challenged,
    reason,
    current: modificationSummary(weapon),
    level: modificationLevel(weapon),
    refund: modificationRefund(weapon),
    mods,
  };
}

const disabled = value => value ? ' disabled' : '';
const title = value => value ? ` title="${escapeHtml(value)}"` : '';

function modificationCard(view, mod) {
  const label = escapeHtml(mod.name);
  const id = escapeHtml(mod.id);
  const weapon = escapeHtml(view.weaponId);
  const level = mod.level ? `Lv.${mod.level}` : '未解锁';
  const activeBadge = mod.active ? '<span class="mod-active">当前启用</span>' : '';
  const levelText = mod.level ? escapeHtml(mod.levelDescription) : escapeHtml(mod.desc);
  const actionDisabled = mod.purchased ? mod.upgradeDisabled : mod.buyDisabled;
  const reason = mod.actionReason || (mod.purchased && mod.active ? '已启用 · 切换免费' : '');
  const action = mod.purchased
    ? mod.level >= 3 ? `<button class="small-button" data-action="mod-upgrade" data-id="${id}" data-mod-id="${id}" data-weapon-id="${weapon}" disabled title="已满级">已满级</button>`
      : `<button class="small-button" data-action="mod-upgrade" data-id="${id}" data-mod-id="${id}" data-weapon-id="${weapon}"${disabled(actionDisabled)}${title(reason || `消耗 ${mod.upgradeCost} 份材料`)}>升级 · ${mod.upgradeCost} 材料</button>`
    : `<button class="small-button" data-action="mod-buy" data-id="${id}" data-mod-id="${id}" data-weapon-id="${weapon}"${disabled(actionDisabled)}${title(reason || '消耗 20 钻石并自动启用')}>购买 · 20 钻石</button>`;
  const switchButton = mod.purchased
    ? `<button class="secondary-button" data-action="mod-equip" data-id="${id}" data-mod-id="${id}" data-weapon-id="${weapon}" data-mod-value="${id}"${disabled(view.reason || mod.active)}${title(mod.active ? '当前已启用' : '切换免费')}>${mod.active ? '当前启用' : '切换 · 免费'}</button>`
    : '';
  const levelDetails = (LEVELS[mod.id] || [mod.desc]).map((detail, index) => `<li class="${mod.level > index ? 'unlocked' : ''}">Lv.${index + 1} · ${escapeHtml(detail)}</li>`).join('');
  return `<article class="modification-card${mod.active ? ' active' : ''}" data-mod-id="${id}"><div class="modification-card-heading"><span class="modification-swatch" style="--mod-color:${escapeHtml(mod.color)}"></span><div><h4>${label} <small>${level}</small></h4>${activeBadge}</div></div><p class="modification-description">${levelText}</p><ul class="modification-level-details">${levelDetails}</ul><div class="modification-levels" aria-label="${label}等级"><span class="${mod.level >= 1 ? 'filled' : ''}">1</span><span class="${mod.level >= 2 ? 'filled' : ''}">2</span><span class="${mod.level >= 3 ? 'filled' : ''}">3</span></div><div class="modification-actions">${action}${switchButton}</div>${reason ? `<p class="modification-reason" role="status">${escapeHtml(reason)}</p>` : ''}</article>`;
}

/**
 * Render the mobile-friendly weapon modification panel.
 *
 * Event contract:
 * `mod-buy`, `mod-upgrade`, `mod-equip`, and `mod-dismantle` each carry
 * `data-weapon-id`; the first three also carry `data-mod-id`.
 */
export function modificationPanel(state = {}, weaponOrId) {
  const view = modificationViewModel(state, weaponOrId);
  if (!view.weapon) {
    return `<section class="modification-panel locked" data-weapon-id=""><header class="modification-header"><h3>武器改造</h3></header><p class="modification-reason" role="status">${escapeHtml(view.reason)}</p></section>`;
  }
  const weapon = escapeHtml(view.weaponId);
  const summary = escapeHtml(view.current);
  const lockCopy = view.reason ? `<p class="modification-lock" role="status">${escapeHtml(view.reason)}</p>` : '';
  const refund = view.refund;
  const hasRefund = refund.gems > 0 || refund.parts > 0;
  const dismantleReason = view.reason || (!hasRefund ? '暂无可拆除改造' : '');
  const unequipReason = view.reason || (view.current === '未启用' ? '当前没有启用的配件' : '');
  const dismantleStatus = dismantleReason ? `<p class="modification-reason" role="status">${escapeHtml(dismantleReason)}</p>` : '';
  return `<section class="modification-panel${view.reason ? ' locked' : ''}" data-weapon-id="${weapon}" aria-label="武器改造"><header class="modification-header"><div><span class="camp-kicker">WEAPON MODS</span><h3>武器改造</h3><p>当前配件：${summary}</p></div><div class="modification-wallet"><span>◆ ${view.gems} 钻石</span><span>⬢ ${view.parts} 材料</span></div></header>${lockCopy}<div class="modification-list">${view.mods.map(mod => modificationCard(view, mod)).join('')}</div><footer class="modification-footer"><button class="secondary-button" data-action="mod-equip" data-id="" data-mod-id="" data-mod-value="" data-weapon-id="${weapon}"${disabled(!!unequipReason)}${title(unequipReason || '卸下当前配件 · 免费')}>卸下当前配件 · 免费</button><button class="secondary-button danger" data-action="mod-dismantle" data-weapon-id="${weapon}"${disabled(!!dismantleReason)}${title(dismantleReason || `拆除返还 ${refund.gems} 钻石 · ${refund.parts} 份材料`)}>拆除全部改造</button><p class="modification-refund">${hasRefund ? `拆除返还 ${refund.gems} 钻石 · ${refund.parts} 份材料 · 全额返还` : '拆除后全额返还已投入资源'}</p>${dismantleStatus}</footer></section>`;
}

