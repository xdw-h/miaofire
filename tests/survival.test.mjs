import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
const run=(s,seconds,hz=120)=>{const out=[];for(let i=0;i<Math.round(seconds*hz);i++)out.push(...game.advance(s,1/hz));return out;};
const boss=()=>{const s=game.createGame();Object.assign(s,{level:5,kills:9,bestEver:4,bestThisRun:4,equipment:[null,null,null]});s.hp=game.targetHealth(s);return s;};
test('team starts with full 100 HP and 60 shield',()=>{
 const s=game.createGame();assert.equal(s.survival?.hp,100);assert.equal(s.survival.shield,60);
});
test('boss warns for two seconds then first strikes at three seconds, shield first',()=>{
 const s=boss();const first=run(s,1);assert.equal(first.filter(e=>e.type==='boss-charge').length,1);
 assert.equal(s.survival?.shield,60);assert.equal(run(s,1).filter(e=>e.type==='boss-strike').length,0);
 const hit=run(s,1).find(e=>e.type==='boss-strike');assert.ok(hit);assert.equal(hit.shieldDamage,40);assert.equal(hit.healthDamage,0);
 assert.equal(s.survival.hp,100);assert.equal(s.survival.shield,20);
});
test('shield regeneration waits three seconds, damage spills into HP',()=>{
 const s=boss();run(s,3);run(s,3);assert.ok(Math.abs(s.survival.shield-20)<1e-7);
 run(s,1);assert.ok(Math.abs(s.survival.shield-24)<1e-7);
 const hit=run(s,1).find(e=>e.type==='boss-strike');assert.ok(Math.abs(hit.shieldDamage-28)<1e-7);assert.ok(Math.abs(hit.healthDamage-12)<1e-7);
 assert.ok(Math.abs(s.survival.hp-88)<1e-7);
});
test('zero team HP ends battle once without stage rewards',()=>{
 const s=boss(),events=run(s,40);assert.equal(s.status,'failed');assert.equal(s.failureReason,'defeat');
 assert.equal(s.survival.hp,0);assert.equal(s.gems,30);assert.equal(s.fish,0);
 assert.equal(events.filter(e=>e.type==='failed').length,1);const before=JSON.stringify(s);run(s,1);assert.equal(JSON.stringify(s),before);
});
test('killing shot cancels a boss attack due on the same simulation step',()=>{
 const s=boss();run(s,2);run(s,119/120);s.hp=1;s.equipment=['w1',null,null];s.cooldowns=[0,0,0];
 const events=game.advance(s,1/120);assert.equal(s.level,6);assert.equal(events.some(e=>e.type==='boss-strike'),false);
 assert.equal(s.survival.hp,100);assert.equal(s.survival.shield,60);
});
test('defense upgrades charge once and fill only extra capacity',()=>{
 const s=game.createGame();s.coins=100;s.survival={...s.survival,hp:40,shield:5};
 assert.equal(game.upgrade(s,'health').ok,true);assert.equal(s.coins,75);assert.equal(s.survival.hp,60);
 assert.equal(game.upgrade(s,'shield').ok,true);assert.equal(s.coins,45);assert.equal(s.survival.shield,20);
 assert.equal(game.defenseStats(s).maxHp,120);assert.equal(game.defenseStats(s).maxShield,75);
 s.coins=1e10;for(let i=0;i<40;i++){game.upgrade(s,'health');game.upgrade(s,'shield');}
 assert.equal(s.upgrades.health,30);assert.equal(s.upgrades.shield,30);
});
test('material challenge freezes main survival, including regeneration and boss countdown',()=>{
 const s=boss();s.equipment=['w1',null,null];run(s,5);const before=JSON.stringify(s.survival);
 game.startChallenge(s,0);run(s,4);assert.equal(JSON.stringify(s.survival),before);
 assert.equal(game.upgrade(s,'health').ok,false);game.exitChallenge(s);assert.equal(JSON.stringify(s.survival),before);
});
test('retry and rebirth restore defenses while rebirth resets defense growth',()=>{
 const s=boss();run(s,40);game.retry(s);assert.equal(s.survival.hp,100);assert.equal(s.survival.shield,60);assert.equal(s.survival.bossTime,0);assert.equal(s.failureReason,null);
 s.coins=100;game.upgrade(s,'health');game.upgrade(s,'shield');game.rebirth(s);
 assert.equal(s.upgrades.health,0);assert.equal(s.upgrades.shield,0);assert.equal(s.survival.hp,100);
});
test('boss offense and shield recovery agree at 30 and 120 Hz',()=>{
 const a=boss(),b=boss();run(a,20,30);run(b,20,120);assert.deepEqual(a.survival,b.survival);assert.equal(a.status,b.status);
});
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('v2 migrates to v3 with an exact backup and keeps trained companions',()=>{
 const db=store(),s=game.createGame();s.coins=123;s.bestEver=5;s.pets.squirrel=2;s.activePet='squirrel';s.fish=79;
 delete s.upgrades.health;delete s.upgrades.shield;delete s.survival;delete s.failureReason;
 const raw=JSON.stringify({version:2,state:s});db.setItem(SAVE_KEY,raw);const r=loadGame(db);
 assert.equal(r.blocked,false);assert.equal(r.migrated,true);assert.equal(db.getItem(`${SAVE_KEY}.backup-v2`),raw);
 assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version,3);assert.equal(r.state.coins,123);assert.equal(r.state.fish,79);assert.equal(r.state.pets.squirrel,2);assert.equal(r.state.survival.hp,100);
});
test('v2 backup failure retains original and blocks autosave',()=>{
 const s=game.createGame(),raw=JSON.stringify({version:2,state:s}),db={getItem:k=>k===SAVE_KEY?raw:null,setItem(){throw Error('full');}};
 const r=loadGame(db);assert.equal(r.blocked,true);assert.equal(db.getItem(SAVE_KEY),raw);
});
test('v3 rejects invalid defense data and reloads valid upgrades with full resources',()=>{
 const db=store(),s=game.createGame();s.coins=100;game.upgrade(s,'health');s.survival={...s.survival,hp:20,shield:0};saveGame(db,s);
 const r=loadGame(db);assert.equal(r.blocked,false);assert.equal(r.state.survival.hp,120);assert.equal(r.state.survival.shield,60);
 for(const mutate of [s=>s.upgrades.health=-1,s=>s.upgrades.shield=31,s=>s.survival.hp=-1,s=>s.survival.shield=1000,s=>s.survival.bossTime=6]){
  const bad=game.createGame();mutate(bad);db.setItem(SAVE_KEY,JSON.stringify({version:3,state:bad}));assert.equal(loadGame(db).blocked,true);
 }
});
