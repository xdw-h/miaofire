import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startChallenge,advance} from '../src/game.mjs';
import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
import {claimPet,carryPet,feedPet,claimMilestone} from '../src/progression.mjs';
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
function legacy(){const s=createGame();for(const k of ['fish','pets','activePet','claimedMilestones','challengeClears','challenge'])delete s[k];s.coins=123;s.gems=70;s.crystals=4;s.level=7;s.bestEver=6;s.bestThisRun=6;return s;}
test('v1 migration backs up exact original and preserves every existing progression value',()=>{
 const db=store(),old=legacy(),raw=JSON.stringify({version:1,state:old});db.setItem(SAVE_KEY,raw);
 const r=loadGame(db);assert.equal(r.blocked,false);assert.equal(r.migrated,true);
 for(const k of ['coins','gems','crystals','level','bestEver','bestThisRun','inventory','equipment','upgrades'])assert.deepEqual(r.state[k],old[k]);
 assert.equal(r.state.fish,0);assert.deepEqual(r.state.pets,{squirrel:0,bird:0,raccoon:0});
 assert.equal(db.getItem(`${SAVE_KEY}.backup-v1`),raw);assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version,3);
 const again=loadGame(db);assert.equal(again.migrated,undefined);assert.equal(db.getItem(`${SAVE_KEY}.backup-v1`),raw);
});
test('backup failure leaves v1 untouched and blocks automatic overwrite',()=>{
 const raw=JSON.stringify({version:1,state:legacy()});const db={getItem:k=>k===SAVE_KEY?raw:null,setItem(){throw Error('quota');}};
 const r=loadGame(db);assert.equal(r.blocked,true);assert.equal(r.state.coins,123);assert.ok(r.warning);assert.equal(db.getItem(SAVE_KEY),raw);
});
test('migration primary-write failure keeps old save and valid backup',()=>{
 const db=store(),raw=JSON.stringify({version:1,state:legacy()});db.setItem(SAVE_KEY,raw);
 const write=db.setItem;db.setItem=(k,v)=>{if(k===SAVE_KEY)throw Error('quota');write(k,v);};
 const r=loadGame(db);assert.equal(r.blocked,true);assert.equal(db.getItem(SAVE_KEY),raw);assert.equal(db.getItem(`${SAVE_KEY}.backup-v1`),raw);
});
test('v2 rejects negative fish, invalid pets, impossible clears and duplicated claims',()=>{
 for(const mutate of [s=>s.fish=-1,s=>s.pets.bird=21,s=>s.activePet='bird',s=>s.challengeClears=1,s=>s.claimedMilestones=['kills10','kills10'],s=>s.pets.squirrel=1]){
  const db=store(),s=createGame();mutate(s);db.setItem(SAVE_KEY,JSON.stringify({version:2,state:s}));assert.equal(loadGame(db).blocked,true);
 }
});
test('reload aborts unfinished challenge without rewards and keeps main progression',()=>{
 const db=store(),s=createGame();s.level=4;s.bestThisRun=3;s.bestEver=3;s.coins=30;startChallenge(s,0);advance(s,.2);saveGame(db,s);
 const r=loadGame(db);assert.equal(r.state.challenge,null);assert.equal(r.state.fish,0);assert.equal(r.state.coins,30);assert.equal(r.state.level,4);
});
test('completed challenge reward survives refresh without being paid again',()=>{
 const db=store(),s=createGame();s.level=4;s.bestThisRun=3;s.bestEver=3;s.upgrades.attack=40;startChallenge(s,0);advance(s,.1);saveGame(db,s);
 const r=loadGame(db);assert.equal(r.state.fish,30);assert.equal(r.state.challengeClears,1);assert.equal(r.state.challenge,null);
 saveGame(db,r.state);assert.equal(loadGame(db).state.fish,30);
});
test('v2 roundtrip preserves pet feeding, active companion and claimed rewards',()=>{
 const db=store(),s=createGame();s.bestEver=3;s.totalKills=50;
 claimPet(s,'squirrel');claimPet(s,'bird');claimMilestone(s,'kills50');
 feedPet(s,'squirrel');carryPet(s,'squirrel');
 assert.equal(saveGame(db,s).ok,true);
 const r=loadGame(db);assert.equal(r.blocked,false);assert.equal(r.state.fish,15);
 assert.deepEqual(r.state.pets,{squirrel:2,bird:1,raccoon:0});
 assert.equal(r.state.activePet,'squirrel');assert.deepEqual(r.state.claimedMilestones,['kills50']);
 assert.equal(claimMilestone(r.state,'kills50').ok,false);
});
