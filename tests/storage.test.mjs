import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, treeHealth} from '../src/game.mjs';
import {saveGame, loadGame, SAVE_KEY} from '../src/storage.mjs';

function memoryStore() {
  const map = new Map();
  return {getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
}

test('new storage creates a playable game', () => {
  const loaded = loadGame(memoryStore());
  assert.equal(loaded.state.level, 1);
  assert.equal(loaded.blocked, false);
});

test('save reload preserves rewards and restarts only current battle', () => {
  const store = memoryStore(), s = createGame();
  s.coins = 123; s.gems = 50; s.level = 4; s.bestThisRun = 3; s.bestEver = 3;
  s.hp = 1; s.kills = 5; s.elapsed = 29;
  assert.equal(saveGame(store, s).ok, true);
  const loaded = loadGame(store);
  assert.equal(loaded.state.coins, 123);
  assert.equal(loaded.state.gems, 50);
  assert.equal(loaded.state.level, 4);
  assert.equal(loaded.state.bestThisRun, 3);
  assert.equal(loaded.state.hp, treeHealth(4));
  assert.equal(loaded.state.kills, 0);
  assert.equal(loaded.state.elapsed, 0);
});

test('corrupt saves are reported and retained', () => {
  const store = memoryStore(); store.setItem(SAVE_KEY, '{broken');
  const result = loadGame(store);
  assert.equal(result.blocked, true);
  assert.ok(result.warning);
  assert.equal(store.getItem(SAVE_KEY), '{broken');
});

test('structurally invalid values and duplicate equipment are rejected', () => {
  for (const mutate of [s => s.coins = -1, s => s.inventory[0].type = 'unknown', s => s.equipment[1] = s.equipment[0], s => s.level = 0, s => s.gems = 'NaN', s => s.nextId = 0]) {
    const store = memoryStore(), s = createGame(); mutate(s);
    store.setItem(SAVE_KEY, JSON.stringify({version: 1, state: s}));
    assert.equal(loadGame(store).blocked, true);
  }
});

test('unavailable local storage allows play but reports non-persistence', () => {
  const store = {getItem() {throw Error('denied');}, setItem() {throw Error('quota');}};
  assert.equal(loadGame(store).state.level, 1);
  assert.ok(loadGame(store).warning);
  assert.equal(saveGame(store, createGame()).ok, false);
});
