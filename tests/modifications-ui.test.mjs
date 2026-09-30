import test from 'node:test';
import assert from 'node:assert/strict';
import {modificationPanel, escapeHtml, modificationSummary} from '../src/modifications-ui.mjs';

const state = (overrides = {}) => ({
  bestEver: 8,
  challenge: null,
  gems: 100,
  workshop: {parts: 24},
  inventory: [{id: 'w1', type: 'pistol', tier: 0, mods: {}, activeMod: null}],
  ...overrides,
});

test('renders a locked panel with a clear unlock reason', () => {
  const html = modificationPanel(state({bestEver: 7}), 'w1');
  assert.match(html, /改造/);
  assert.match(html, /通过第 8 关后解锁/);
  assert.match(html, /data-action="mod-buy"/);
  assert.match(html, /disabled/);
  assert.equal((html.match(/class="modification-card"/g) || []).length, 3);
});

test('renders levels, active mod, costs, and action attributes', () => {
  const html = modificationPanel(state({
    gems: 10,
    workshop: {parts: 7},
    inventory: [{id: 'w&1', type: 'pistol', tier: 2, mods: {pierce: 1, ricochet: 2}, activeMod: 'ricochet'}],
  }), 'w&1');
  assert.match(html, /穿透刃/);
  assert.match(html, /弹射/);
  assert.match(html, /Lv\.1/);
  assert.match(html, /Lv\.2/);
  assert.match(html, /当前配件：弹射/);
  assert.match(html, /升级 · 8 材料/);
  assert.match(html, /购买 · 20 钻石/);
  assert.match(html, /data-action="mod-equip"/);
  assert.match(html, /data-action="mod-upgrade"/);
  assert.match(html, /data-action="mod-dismantle"/);
  assert.match(html, /data-weapon-id="w&amp;1"/);
});

test('shows unavailable resource reasons without enabling actions', () => {
  const html = modificationPanel(state({gems: 0, workshop: {parts: 0}}), 'w1');
  assert.match(html, /还差 20 钻石/);
  assert.match(html, /购买 · 20 钻石/);
  assert.match(html, /disabled/);
});

test('summarizes active and dismantle refund safely', () => {
  const html = modificationPanel(state({
    gems: 1,
    workshop: {parts: 0},
    inventory: [{id: 'w1', type: 'pistol', tier: 0, mods: {pierce: 1, burn: 3}, activeMod: 'burn'}],
  }), 'w1');
  assert.match(modificationSummary(state().inventory[0]), /未启用/);
  assert.match(html, /当前配件：燃烧/);
  assert.match(html, /拆除返还 40 钻石/);
  assert.match(html, /24 份材料/);
});

test('escapes text used in attributes and labels', () => {
  assert.equal(escapeHtml('<script>&"\''), '&lt;script&gt;&amp;&quot;&#39;');
});

test('renders a safe empty state for malformed input', () => {
  assert.doesNotThrow(() => modificationPanel(null, 'missing'));
  assert.match(modificationPanel(null, 'missing'), /武器不存在/);
});
