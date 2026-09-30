import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,rebirth} from '../src/game.mjs';
import {SAVE_KEY,saveGame,loadGame,validateState} from '../src/storage.mjs';

const store=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const state=()=>({...createGame(),endless:{bestWaves:0}});

test('v1 through v4 migrate to v5 only after an exact raw backup and ignore unknown endless data',()=>{
  for(const version of [1,2,3,4]){
    const db=store(),s=state();Object.assign(s,{coins:321,gems:88,crystals:7,totalKills:12});
    s.endless={bestWaves:999999};
    const raw=JSON.stringify({version,state:s},null,2);db.setItem(SAVE_KEY,raw);
    const writes=[],write=db.setItem;db.setItem=(key,value)=>{writes.push(key);write(key,value);};
    const loaded=loadGame(db);
    assert.equal(loaded.blocked,false);assert.equal(loaded.migrated,true);
    assert.deepEqual(loaded.state.endless,{bestWaves:0});
    for(const key of ['coins','gems','crystals','totalKills','inventory','equipment'])assert.deepEqual(loaded.state[key],s[key]);
    assert.equal(db.getItem(`${SAVE_KEY}.backup-v${version}`),raw);
    assert.deepEqual(writes,[`${SAVE_KEY}.backup-v${version}`,SAVE_KEY]);
    assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version,5);
    assert.equal(loadGame(db).migrated,undefined);
  }
});

test('v4 migration retains an existing backup without rewriting it',()=>{
  const db=store();db.setItem(`${SAVE_KEY}.backup-v4`,'original backup');
  db.setItem(SAVE_KEY,JSON.stringify({version:4,state:state()}));
  assert.equal(loadGame(db).blocked,false);
  assert.equal(db.getItem(`${SAVE_KEY}.backup-v4`),'original backup');
});

test('a real v4 save without endless data gains the default and keeps its prior rewards',()=>{
  const db=store(),s=createGame();delete s.endless;
  s.coins=420;s.fish=35;s.daily.lastClaimed='2026-09-29';
  Object.assign(s,{level:4,bestThisRun:3,bestEver:3});
  s.expedition={milestone:3,choices:['attack'],pending:null};
  const raw=JSON.stringify({version:4,state:s});db.setItem(SAVE_KEY,raw);
  const loaded=loadGame(db);assert.equal(loaded.blocked,false);assert.equal(loaded.migrated,true);
  assert.deepEqual(loaded.state.endless,{bestWaves:0});
  for(const key of ['coins','fish','daily','expedition','level','bestThisRun','bestEver'])assert.deepEqual(loaded.state[key],s[key]);
  assert.equal(db.getItem(`${SAVE_KEY}.backup-v4`),raw);
  const refreshed=loadGame(db);assert.equal(refreshed.blocked,false);assert.equal(refreshed.state.coins,420);
});

test('v4 backup or primary write failure protects the original and blocks saving',()=>{
  for(const failedKey of [`${SAVE_KEY}.backup-v4`,SAVE_KEY]){
    const db=store(),raw=JSON.stringify({version:4,state:state()});db.setItem(SAVE_KEY,raw);
    const write=db.setItem;db.setItem=(key,value)=>{if(key===failedKey)throw Error('quota');write(key,value);};
    const loaded=loadGame(db);assert.equal(loaded.blocked,true);assert.ok(loaded.warning);
    assert.equal(db.getItem(SAVE_KEY),raw);
    if(failedKey===SAVE_KEY)assert.equal(db.getItem(`${SAVE_KEY}.backup-v4`),raw);
  }
});

test('v5 best wave bounds survive refresh and rebirth',()=>{
  for(const bestWaves of [0,1,99999]){
    const db=store(),s=state();s.endless.bestWaves=bestWaves;
    Object.assign(s,{level:4,bestThisRun:3,bestEver:3});
    assert.equal(saveGame(db,s).ok,true);assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version,5);
    const loaded=loadGame(db);assert.equal(loaded.blocked,false);
    assert.equal(loaded.state.endless.bestWaves,bestWaves);
    assert.equal(rebirth(loaded.state).ok,true);assert.equal(loaded.state.endless.bestWaves,bestWaves);
    saveGame(db,loaded.state);assert.equal(loadGame(db).state.endless.bestWaves,bestWaves);
  }
});

test('invalid or missing v5 endless score blocks loading and preserves exact original',()=>{
  for(const endless of [undefined,null,{},[],{bestWaves:-1},{bestWaves:1.5},{bestWaves:100000},{bestWaves:'3'},{bestWaves:null}]){
    const db=store(),s=state();s.endless=endless;
    assert.equal(validateState(s),false);
    const raw=JSON.stringify({version:5,state:s});db.setItem(SAVE_KEY,raw);
    assert.equal(loadGame(db).blocked,true);assert.equal(db.getItem(SAVE_KEY),raw);
  }
});

test('saving during endless mode stores only the best record and strips the runtime challenge',()=>{
  const db=store(),s=state();s.endless.bestWaves=12;s.coins=123;
  s.challenge={kind:'endless',status:'playing',run:{endlessRun:{waves:13},marker:'runtime only'}};
  assert.equal(saveGame(db,s).ok,true);
  const saved=JSON.parse(db.getItem(SAVE_KEY));assert.equal(saved.version,5);
  assert.equal(saved.state.challenge,null);assert.equal(db.getItem(SAVE_KEY).includes('runtime only'),false);
  const loaded=loadGame(db);assert.equal(loaded.blocked,false);assert.equal(loaded.state.challenge,null);
  assert.equal(loaded.state.endless.bestWaves,12);assert.equal(loaded.state.coins,123);
});
