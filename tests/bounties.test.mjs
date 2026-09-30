import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {enemyAttack} from '../src/survival.mjs';
import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
const ready=()=>{const s=game.createGame();s.bestEver=10;return s;};
const step=(s,seconds,hz=120)=>{const events=[];for(let i=0;i<Math.round(seconds*hz);i++)events.push(...game.advance(s,1/hz));return events;};
test('bounty requires stage ten, valid boss and idle state; copies equipment without sharing main combat',()=>{
 assert.equal(typeof game.startBounty,'function');
 const s=game.createGame();assert.equal(game.startBounty(s,'guardian').ok,false);
 s.bestEver=10;assert.equal(game.startBounty(s,'unknown').ok,false);
 s.inventory[0].mods={burn:2};s.inventory[0].activeMod='burn';
 const before=structuredClone(s);assert.equal(game.startBounty(s,'guardian').ok,true);
 assert.equal(game.startBounty(s,'toxic').ok,false);
 assert.deepEqual(s.challenge.run.inventory,s.inventory);assert.notEqual(s.challenge.run.inventory,s.inventory);
 step(s,2);game.exitChallenge(s);assert.deepEqual(s,before);
});
test('guardian renews a bounded shield every eight seconds; poison ticks and rage doubles heavy strikes',()=>{
 assert.equal(typeof game.startBounty,'function');
 const g=ready();game.startBounty(g,'guardian');g.challenge.run.equipment=[null,null,null];
 step(g,.1);assert.ok(g.challenge.run.combat.enemyShield>0);
 g.challenge.run.combat.enemyShield=0;step(g,7.9);assert.ok(g.challenge.run.combat.enemyShield>0);
 const t=ready();game.startBounty(t,'toxic');t.challenge.run.equipment=[null,null,null];
 const events=step(t,6);assert.ok(events.some(e=>e.type==='poison-tick'));assert.ok(t.challenge.run.survival.hp<100);
 const r=ready();game.startBounty(r,'berserker');const normal=enemyAttack(r);
 r.challenge.run.hp=game.targetHealth(r)*.4;const rage=enemyAttack(r);
 assert.equal(rage.damage,normal.damage*2);assert.equal(rage.windup,3);
});
test('bounty pays first and repeat materials exactly once; failure and abandonment pay nothing',()=>{
 assert.equal(typeof game.startBounty,'function');
 const s=ready();s.upgrades.attack=60;
 game.startBounty(s,'guardian');const events=step(s,1);
 assert.equal(s.challenge.status,'won');assert.equal(s.workshop.parts,12);assert.ok(s.bounties.cleared.includes('guardian'));
 assert.equal(events.filter(e=>e.type==='challenge-result').length,1);step(s,5);assert.equal(s.workshop.parts,12);
 game.exitChallenge(s);game.startBounty(s,'guardian');step(s,1);assert.equal(s.workshop.parts,16);
 const weak=ready();game.startBounty(weak,'berserker');step(weak,60);assert.equal(weak.challenge.status,'failed');assert.equal(weak.workshop.parts,0);
 game.exitChallenge(weak);game.startBounty(weak,'toxic');game.exitChallenge(weak);assert.equal(weak.workshop.parts,0);
});
test('bounty simulation and poison are independent of screen refresh rate',()=>{
 assert.equal(typeof game.startBounty,'function');
 const simulate=hz=>{const s=ready();game.startBounty(s,'toxic');step(s,18,hz);assert.ok(s.challenge.run.accumulator<1e-8);s.challenge.run.accumulator=0;return s;};
 assert.deepEqual(simulate(30),simulate(120));
});
test('legacy saves gain bounty defaults, wins persist and corrupt claims are rejected',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const s=ready();delete s.bounties;saveGame(storage,s);
 const restored=loadGame(storage);assert.equal(restored.blocked,false);assert.deepEqual(restored.state.bounties,{cleared:[]});
 restored.state.upgrades.attack=60;game.startBounty(restored.state,'guardian');step(restored.state,1);saveGame(storage,restored.state);
 const again=loadGame(storage);assert.equal(again.blocked,false);assert.deepEqual(again.state.bounties.cleared,['guardian']);assert.equal(again.state.challenge,null);assert.equal(again.state.workshop.parts,12);
 const data=JSON.parse(storage.getItem(SAVE_KEY));data.state.bounties.cleared=['invalid'];storage.setItem(SAVE_KEY,JSON.stringify(data));assert.equal(loadGame(storage).blocked,true);
});
