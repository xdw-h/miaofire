import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {saveGame,loadGame} from '../src/storage.mjs';

function encounter(type,kind='boss',ratio=1){
 const s=game.createGame();s.level=10;s.bestThisRun=9;s.bestEver=9;s.kills=kind==='boss'?9:kind==='armored'?3:0;
 s.inventory[0].type=type;s.hp=game.currentEnemy(s).hp*ratio;return s;
}
const firstShot=s=>game.advance(s,1/120).find(e=>e.type==='shot');
test('all seven weapons are reachable through equal random buckets and endpoint clamp',()=>{
 assert.equal(Object.keys(game.TYPES).length,7);
 for(const [i,type]of Object.keys(game.TYPES).entries()){
  const s=game.createGame();assert.equal(game.drawWeapon(s,()=>i/7+.001).weapon.type,type);
 }
 assert.equal(game.drawWeapon(game.createGame(),()=>1).weapon.type,'ward');
});
test('directed supply costs twenty, rejects invalid/poor/full/challenge atomically',()=>{
 assert.equal(typeof game.orderWeapon,'function');
 const s=game.createGame(),r=game.orderWeapon(s,'sniper');assert.equal(r.weapon.type,'sniper');assert.equal(r.weapon.tier,0);assert.equal(s.gems,10);
 for(const mutate of [s=>s.gems=19,s=>s.challenge={tier:0},s=>{s.inventory=Array.from({length:120},(_,i)=>({id:`w${i+1}`,type:'pistol',tier:0}));}]){
  const s=game.createGame();mutate(s);const before=JSON.stringify(s);assert.equal(game.orderWeapon(s,'ward').ok,false);assert.equal(JSON.stringify(s),before);
 }
 const before=JSON.stringify(s);assert.equal(game.orderWeapon(s,'__proto__').ok,false);assert.equal(JSON.stringify(s),before);
});
test('sniper bonus only applies to bosses, crossbow bypasses armor',()=>{
 assert.ok(game.TYPES.sniper&&game.TYPES.crossbow);
 assert.equal(firstShot(encounter('sniper')).damage,24);
 assert.equal(firstShot(encounter('sniper','slime')).damage,18);
 assert.equal(firstShot(encounter('crossbow','armored')).damage,9);
 assert.equal(firstShot(encounter('pistol','armored')).damage,3);
});
test('rocket executes only at or below thirty percent before the shot',()=>{
 assert.ok(game.TYPES.rocket);
 assert.equal(firstShot(encounter('rocket','boss',.3)).damage,36);
 assert.equal(firstShot(encounter('rocket','boss',.301)).damage,24);
 assert.equal(firstShot(encounter('rocket','armored',.3)).damage,27);
});
test('ward replenishes bounded shields, scales by tier, never heals health or alters hit timer',()=>{
 assert.ok(game.TYPES.ward);
 const s=encounter('ward');s.survival.shield=59;s.survival.hp=50;s.survival.damageAgo=0;
 const shot=firstShot(s);assert.equal(shot.shieldRestored,1);assert.equal(s.survival.shield,60);assert.equal(s.survival.hp,50);assert.ok(s.survival.damageAgo<.01);
 const b=encounter('ward');b.survival.shield=0;b.survival.damageAgo=0;b.inventory[0].tier=4;b.upgrades.attack=10;
 assert.equal(firstShot(b).shieldRestored,10);
});
test('ward challenge shots leave the frozen main defense untouched',()=>{
 assert.ok(game.TYPES.ward);
 const s=encounter('ward');s.survival.shield=12;game.startChallenge(s,0);const before=JSON.stringify(s.survival);
 const shot=firstShot(s);assert.equal(shot.shieldRestored,0);assert.equal(JSON.stringify(s.survival),before);
});
test('new weapons survive saves and mixed combat is refresh-rate independent',()=>{
 assert.ok(game.TYPES.ward);
 const s=encounter('sniper');s.inventory.push({id:'w2',type:'crossbow',tier:1},{id:'w3',type:'ward',tier:0},{id:'w4',type:'rocket',tier:2});s.nextId=5;s.equipment=['w1','w2','w3'];
 const storage={raw:null,setItem(k,v){this.raw=v;},getItem(){return this.raw;}};
 saveGame(storage,s);const loaded=loadGame(storage);assert.equal(loaded.blocked,false);assert.deepEqual(loaded.state.inventory,s.inventory);assert.deepEqual(loaded.state.equipment,s.equipment);
 const a=structuredClone(s),b=structuredClone(s);for(let i=0;i<300;i++)game.advance(a,1/30);for(let i=0;i<1200;i++)game.advance(b,1/120);
 for(const key of ['hp','kills','level','coins','status'])assert.equal(a[key],b[key]);assert.deepEqual(a.survival,b.survival);
});

test('each new weapon merges from matching unequipped copies and keeps tier progression',()=>{
 for(const type of ['sniper','crossbow','rocket','ward']){
  const s=game.createGame();s.gems=40;const a=game.orderWeapon(s,type).weapon,b=game.orderWeapon(s,type).weapon;
  const r=game.mergeWeapons(s,a.id,b.id,()=>.999);assert.equal(r.ok,true);assert.equal(r.weapon.type,'ward');assert.equal(r.weapon.tier,1);assert.equal(s.inventory.length,2);
 }
});
