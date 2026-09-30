import test from 'node:test';import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {loadGame,saveGame,SAVE_KEY} from '../src/storage.mjs';
import {offerBlessing} from '../src/blessings.mjs';
function milestone(){const s=game.createGame();Object.assign(s,{level:3,bestThisRun:2,bestEver:2,kills:9,totalKills:29,hp:1});return s;}
const store=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('third stage gives three distinct choices and stops all combat until selection',()=>{
 const s=milestone();game.advance(s,1/120);assert.ok(s.expedition?.pending);assert.equal(s.level,4);assert.equal(s.expedition.pending.options.length,3);assert.equal(new Set(s.expedition.pending.options).size,3);
 const before=JSON.stringify(s);game.advance(s,.2);assert.equal(JSON.stringify(s),before);
 assert.equal(game.chooseBlessing(s,s.expedition.pending.options[0]).ok,true);assert.equal(s.expedition.pending,null);game.advance(s,.1);assert.ok(s.elapsed>0);
});
test('invalid and repeated blessing selection cannot change state',()=>{
 const s=milestone();game.advance(s,1/120);assert.ok(s.expedition);let before=JSON.stringify(s);assert.equal(game.chooseBlessing(s,'fake').ok,false);assert.equal(JSON.stringify(s),before);
 const id=s.expedition.pending.options[0];game.chooseBlessing(s,id);before=JSON.stringify(s);assert.equal(game.chooseBlessing(s,id).ok,false);assert.equal(JSON.stringify(s),before);
});
test('pending choices persist without reroll, chosen blessings persist on retry and clear on rebirth',()=>{
 const s=milestone();game.advance(s,1/120);assert.ok(s.expedition);const db=store();saveGame(db,s);const r=loadGame(db).state;assert.deepEqual(r.expedition,s.expedition);
 game.chooseBlessing(r,r.expedition.pending.options[0]);const chosen=structuredClone(r.expedition);r.status='failed';game.retry(r);assert.deepEqual(r.expedition,chosen);
 saveGame(db,r);assert.deepEqual(loadGame(db).state.expedition,chosen);game.rebirth(r);assert.equal(r.expedition.choices.length,0);assert.equal(r.expedition.pending,null);
});
test('legacy v3 backup preserves raw and provides one catch-up blessing',()=>{
 const s=game.createGame();s.level=8;s.bestEver=7;s.bestThisRun=7;s.gems=123;delete s.expedition;const raw=JSON.stringify({version:3,state:s}),db=store();db.setItem(SAVE_KEY,raw);
 const r=loadGame(db);assert.equal(r.blocked,false);assert.equal(db.getItem(SAVE_KEY+'.backup-v3'),raw);assert.equal(r.state.gems,123);assert.equal(r.state.expedition.pending.stage,6);assert.equal(JSON.parse(db.getItem(SAVE_KEY)).version,5);
});
test('all six blessings stack in actual combat and shield capacity',()=>{
 const s=game.createGame();s.level=10;s.bestThisRun=9;s.bestEver=9;s.upgrades.attack=10;s.expedition={milestone:36,pending:null,choices:['attack','attack','speed','speed','harvest','harvest','courage','courage','barrier','barrier','hunter','hunter']};
 const p=game.weaponPower(s,s.inventory[0]);assert.equal(p.damage,Math.round(5*1.22**10*1.16));assert.equal(p.rate,2*1.1);assert.equal(game.defenseStats(s).maxShield,90);
 s.kills=9;s.hp=game.targetHealth(s);s.survival.hp=35;s.survival.shield=0;let shot=game.advance(s,1/120).find(e=>e.type==='shot');assert.equal(shot.damage,Math.floor(p.damage*1.4*1.24));
 s.kills=0;s.hp=1;s.cooldowns=[0,0,0];s.survival.damageAgo=0;s.survival.shield=0;game.advance(s,1/120);assert.equal(s.survival.shield,12);
});
test('sixth and ninth milestones offer once, invalid save choices preserve original',()=>{
 const s=game.createGame();for(const stage of [3,6,9]){s.bestThisRun=stage;s.bestEver=stage;s.level=stage+1;assert.equal(offerBlessing(s,stage),true);game.chooseBlessing(s,s.expedition.pending.options[0]);assert.equal(offerBlessing(s,stage),false);}assert.equal(s.expedition.choices.length,3);
 const db=store();s.expedition.pending={stage:9,options:['attack','attack','bad']};const raw=JSON.stringify({version:4,state:s});db.setItem(SAVE_KEY,raw);assert.equal(loadGame(db).blocked,true);assert.equal(db.getItem(SAVE_KEY),raw);
});
