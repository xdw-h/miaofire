import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, buyModification, equipModification, upgradeModification, dismantleModifications, advance, mergeWeapons} from '../src/game.mjs';

function unlocked() { const s=createGame(); s.bestEver=8; s.gems=100; s.workshop.parts=100; return s; }

test('modification purchase unlocks at eight and auto equips, switching is free',()=>{
  const s=createGame(); assert.equal(buyModification(s,'w1','burn').ok,false);
  s.bestEver=8; const before=s.gems; assert.equal(buyModification(s,'w1','burn').ok,true);
  assert.equal(s.gems,before-20); assert.equal(s.inventory[0].mods.burn,1); assert.equal(s.inventory[0].activeMod,'burn');
  assert.equal(equipModification(s,'w1',null).ok,true); assert.equal(s.inventory[0].activeMod,null);
});

test('upgrade charges parts atomically and dismantle refunds paid costs',()=>{
  const s=unlocked(); buyModification(s,'w1','pierce');
  assert.equal(upgradeModification(s,'w1','pierce').ok,true); assert.equal(s.workshop.parts,92);
  assert.equal(upgradeModification(s,'w1','pierce').ok,true); assert.equal(s.workshop.parts,76);
  assert.equal(dismantleModifications(s,'w1').ok,true); assert.equal(s.gems,100); assert.equal(s.workshop.parts,100); assert.equal(s.inventory[0].activeMod,null);
});

test('modified weapons cannot be merged until dismantled',()=>{
  const s=unlocked(); const a={id:'w2',type:'pistol',tier:0,mods:{burn:1},activeMod:'burn'}; const b={id:'w3',type:'pistol',tier:0}; s.inventory.push(a,b);
  assert.equal(mergeWeapons(s,'w2','w3').ok,false); dismantleModifications(s,'w2'); assert.equal(mergeWeapons(s,'w2','w3').ok,true);
});

test('burn emits ticks and damage is refresh-rate invariant',()=>{
  const a=unlocked(); a.inventory[0].mods={burn:3}; a.inventory[0].activeMod='burn'; a.level=1; a.hp=1;
  const b=structuredClone(a); const ea=[]; const eb=[];
  for(let i=0;i<360;i++) ea.push(...advance(a,1/120));
  for(let i=0;i<90;i++) eb.push(...advance(b,1/30));
  assert.ok(ea.some(e=>e.type==='burn-tick')); assert.equal(a.totalKills,b.totalKills); assert.equal(a.coins,b.coins);
});
