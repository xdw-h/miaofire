import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, advance, upgrade, drawWeapon, equipWeapon, unequipWeapon, mergeWeapons, rebirth, retry, stats, upgradeCost, treeHealth} from '../src/game.mjs';

test('new game starts with one equipped cat, 30 gems and no coins', () => {
  const s = createGame();
  assert.equal(s.coins, 0);
  assert.equal(s.gems, 30);
  assert.equal(s.inventory.length, 1);
  assert.equal(s.equipment.filter(Boolean).length, 1);
  assert.equal(s.level, 1);
  assert.equal(s.hp, treeHealth(1));
});

test('unaffordable and invalid upgrades cannot mutate resources', () => {
  const s = createGame(), before = JSON.stringify(s);
  assert.equal(upgrade(s, 'attack').ok, false);
  assert.equal(upgrade(s, 'unknown').ok, false);
  assert.equal(JSON.stringify(s), before);
});

test('buying an upgrade subtracts the displayed cost and improves stats', () => {
  const s = createGame(); s.coins = 1000;
  const dps = stats(s).dps, cost = upgradeCost(s, 'attack');
  assert.equal(upgrade(s, 'attack').ok, true);
  assert.equal(s.coins, 1000 - cost);
  assert.ok(stats(s).dps > dps);
  for (let i = 0; i < 100; i++) upgrade(s, 'attack');
  assert.ok(s.coins >= 0);
});

test('automatic combat earns coins and clears levels', () => {
  const s = createGame();
  for (let i = 0; i < 2400; i++) advance(s, 1 / 60);
  assert.ok(s.coins > 0);
  assert.ok(s.totalKills >= 10);
  assert.ok(s.level >= 2);
  assert.ok(s.gems >= 40);
});

test('combat is independent of display refresh rate', () => {
  const a = createGame(), b = createGame();
  for (let i = 0; i < 900; i++) advance(a, 1 / 30);
  for (let i = 0; i < 3600; i++) advance(b, 1 / 120);
  assert.equal(a.totalKills, b.totalKills);
  assert.equal(a.level, b.level);
  assert.equal(a.coins, b.coins);
  assert.equal(a.hp, b.hp);
});

test('timeout stops combat until explicit retry', () => {
  const s = createGame();
  s.level = 50; s.hp = treeHealth(50);
  for (let i = 0; i < 3700; i++) advance(s, 1 / 60);
  assert.equal(s.status, 'failed');
  const snapshot = JSON.stringify(s);
  advance(s, 1);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(retry(s).ok, true);
  assert.equal(s.status, 'playing');
  assert.equal(s.elapsed, 0);
  assert.equal(s.hp, treeHealth(50));
});

test('draw spends exactly ten gems and cannot overdraft', () => {
  const s = createGame();
  for (let i = 0; i < 3; i++) assert.equal(drawWeapon(s, () => 0).ok, true);
  assert.equal(s.gems, 0);
  assert.equal(s.inventory.length, 4);
  const snapshot = JSON.stringify(s);
  assert.equal(drawWeapon(s).ok, false);
  assert.equal(JSON.stringify(s), snapshot);
});

test('each weapon can occupy only one of three valid slots', () => {
  const s = createGame();
  drawWeapon(s, () => 0.5);
  const id = s.inventory[1].id;
  assert.equal(equipWeapon(s, id, 1).ok, true);
  assert.equal(equipWeapon(s, id, 2).ok, false);
  assert.equal(equipWeapon(s, id, 4).ok, false);
  assert.equal(equipWeapon(s, 'missing', 2).ok, false);
  assert.equal(unequipWeapon(s, 1).ok, true);
  assert.equal(s.equipment[1], null);
});

test('merging consumes exactly two matching unequipped weapons', () => {
  const s = createGame();
  drawWeapon(s, () => 0); drawWeapon(s, () => 0);
  const [a, b] = s.inventory.slice(1);
  assert.equal(mergeWeapons(s, a.id, b.id, () => 0.5).ok, true);
  assert.equal(s.inventory.length, 2);
  assert.equal(s.inventory.some(w => w.id === a.id || w.id === b.id), false);
  assert.equal(s.inventory.find(w => w.tier === 1).type, 'smg');
});

test('merge rejects equipped, identical, mismatched and max-level inputs atomically', () => {
  const s = createGame();
  drawWeapon(s, () => 0); drawWeapon(s, () => 0.9);
  const [a, b, c] = s.inventory;
  assert.equal(mergeWeapons(s, a.id, b.id).ok, false);
  assert.equal(mergeWeapons(s, b.id, b.id).ok, false);
  assert.equal(mergeWeapons(s, b.id, c.id).ok, false);
  b.tier = 4; c.tier = 4; c.type = b.type;
  const before = JSON.stringify(s);
  assert.equal(mergeWeapons(s, b.id, c.id).ok, false);
  assert.equal(JSON.stringify(s), before);
});

test('rebirth preserves permanent progress and cannot collect a reward twice', () => {
  const s = createGame();
  assert.equal(rebirth(s).ok, false);
  s.bestThisRun = 6; s.bestEver = 6; s.level = 7;
  s.coins = 200; s.upgrades.attack = 3;
  drawWeapon(s, () => 0.5);
  const inventory = JSON.stringify(s.inventory), equipment = JSON.stringify(s.equipment), gems = s.gems;
  assert.equal(rebirth(s).ok, true);
  assert.equal(s.crystals, 2);
  assert.equal(s.coins, 0);
  assert.equal(s.upgrades.attack, 0);
  assert.equal(s.level, 1);
  assert.equal(s.bestEver, 6);
  assert.equal(s.gems, gems);
  assert.equal(JSON.stringify(s.inventory), inventory);
  assert.equal(JSON.stringify(s.equipment), equipment);
  assert.equal(rebirth(s).ok, false);
  assert.equal(s.crystals, 2);
});

test('speed and transaction costs stay finite at upper upgrade limits', () => {
  const s = createGame(); s.coins = 1e30;
  for (let i = 0; i < 100; i++) upgrade(s, 'speed');
  assert.equal(s.upgrades.speed, 30);
  assert.equal(upgrade(s, 'speed').ok, false);
  assert.ok(Number.isFinite(stats(s).dps));
  assert.ok(Number.isFinite(upgradeCost(s, 'speed')));
});
