import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, rebirth} from '../src/game.mjs';
import {loadGame, saveGame, validateState, SAVE_KEY} from '../src/storage.mjs';

const store = () => {
  const map = new Map();
  return {
    map,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
};

const modifiedState = () => {
  const state = createGame();
  state.workshop = {parts: 42};
  state.inventory[0].mods = {pierce: 2, ricochet: 0, burn: 1};
  state.inventory[0].activeMod = 'pierce';
  return state;
};

test('version 6 saves workshop and weapon modifications while stripping challenge runtime', () => {
  const db = store();
  const state = modifiedState();
  state.challenge = {kind: 'daily', run: {marker: 'runtime only'}};
  assert.equal(saveGame(db, state).ok, true);

  const saved = JSON.parse(db.getItem(SAVE_KEY));
  assert.equal(saved.version, 6);
  assert.deepEqual(saved.state.workshop, {parts: 42});
  assert.deepEqual(saved.state.inventory[0].mods, {pierce: 2, ricochet: 0, burn: 1});
  assert.equal(saved.state.inventory[0].activeMod, 'pierce');
  assert.equal(saved.state.challenge, null);
  assert.equal(db.getItem(SAVE_KEY).includes('runtime only'), false);

  const loaded = loadGame(db);
  assert.equal(loaded.blocked, false);
  assert.deepEqual(loaded.state.workshop, {parts: 42});
  assert.deepEqual(loaded.state.inventory[0].mods, {pierce: 2, ricochet: 0, burn: 1});
  assert.equal(loaded.state.inventory[0].activeMod, 'pierce');
  assert.equal(loaded.state.challenge, null);
});

test('v1 through v5 migration backs up exact raw data and removes legacy modifications', () => {
  for (const version of [1, 2, 3, 4, 5]) {
    const db = store();
    const state = createGame();
    state.inventory[0].mods = {unknown: 3, pierce: 3};
    state.inventory[0].activeMod = 'unknown';
    const raw = JSON.stringify({version, state}, null, 2);
    db.setItem(SAVE_KEY, raw);

    const loaded = loadGame(db);
    assert.equal(loaded.blocked, false, `v${version}`);
    assert.equal(loaded.migrated, true, `v${version}`);
    assert.equal(db.getItem(`${SAVE_KEY}.backup-v${version}`), raw);
    assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version, 6);
    assert.deepEqual(loaded.state.workshop, {parts: 0});
    assert.equal(Object.hasOwn(loaded.state.inventory[0], 'mods'), false);
    assert.equal(Object.hasOwn(loaded.state.inventory[0], 'activeMod'), false);
  }
});

test('legacy runtime challenge is not carried into the version 6 save', () => {
  const db = store();
  const state = createGame();
  state.challenge = {kind: 'legacy-runtime', run: {marker: 'discarded'}};
  const raw = JSON.stringify({version: 1, state});
  db.setItem(SAVE_KEY, raw);
  const loaded = loadGame(db);
  assert.equal(loaded.blocked, false);
  assert.equal(loaded.state.challenge, null);
  assert.equal(JSON.parse(db.getItem(SAVE_KEY)).state.challenge, null);
  assert.equal(db.getItem(`${SAVE_KEY}.backup-v1`), raw);
});

test('version 6 validates workshop bounds and modification shape', () => {
  const invalid = [
    state => { state.workshop = undefined; },
    state => { state.workshop = null; },
    state => { state.workshop = {parts: -1}; },
    state => { state.workshop = {parts: 1.5}; },
    state => { state.workshop = {parts: 1e9 + 1}; },
    state => { state.inventory[0].mods = null; },
    state => { state.inventory[0].mods = {laser: 1}; },
    state => { state.inventory[0].mods = {pierce: -1}; },
    state => { state.inventory[0].mods = {pierce: 4}; },
    state => { state.inventory[0].mods = {pierce: 1.5}; },
    state => { state.inventory[0].mods = {pierce: '1'}; },
    state => { state.inventory[0].activeMod = 'laser'; },
    state => { state.inventory[0].mods = {pierce: 0}; state.inventory[0].activeMod = 'pierce'; },
    state => { state.inventory[0].activeMod = 1; },
    state => { state.challenge = {kind: 'runtime'}; },
  ];
  for (const mutate of invalid) {
    const state = modifiedState();
    mutate(state);
    assert.equal(validateState(state, 6), false);
  }
});

test('missing modification keys and null activeMod are valid', () => {
  const state = createGame();
  state.workshop = {parts: 0};
  state.inventory[0].mods = {pierce: 0};
  state.inventory[0].activeMod = null;
  assert.equal(validateState(state, 6), true);
});

test('weapon modifications survive rebirth and refresh', () => {
  const db = store();
  const state = modifiedState();
  state.bestThisRun = 3;
  state.bestEver = 3;
  assert.equal(rebirth(state).ok, true);
  assert.deepEqual(state.inventory[0].mods, {pierce: 2, ricochet: 0, burn: 1});
  assert.equal(state.inventory[0].activeMod, 'pierce');
  assert.equal(saveGame(db, state).ok, true);
  const loaded = loadGame(db);
  assert.deepEqual(loaded.state.inventory[0].mods, {pierce: 2, ricochet: 0, burn: 1});
  assert.equal(loaded.state.inventory[0].activeMod, 'pierce');
});
