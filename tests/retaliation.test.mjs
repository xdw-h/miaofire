import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,targetHealth,startChallenge,exitChallenge} from '../src/game.mjs';
import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
const run=(s,seconds,hz=120)=>{const events=[];for(let i=0;i<Math.round(seconds*hz);i++)events.push(...advance(s,1/hz));return events;};
test('first-stage slime retaliates at one second, then every four seconds',()=>{
 const s=createGame();s.equipment=[null,null,null];
 assert.equal(run(s,119/120).some(e=>e.type==='enemy-strike'),false);
 const hit=run(s,1/120).find(e=>e.type==='enemy-strike');assert.ok(hit);assert.equal(hit.enemyKind,'slime');assert.equal(hit.shieldDamage,4);assert.equal(s.survival.shield,56);
 assert.equal(run(s,3).some(e=>e.type==='enemy-strike'),false);assert.equal(run(s,1).filter(e=>e.type==='enemy-strike').length,1);
});
test('every new enemy gets its own warning and dead enemies cannot retaliate',()=>{
 const s=createGame();s.equipment=[null,null,null];run(s,119/120);s.hp=1;s.equipment=['w1',null,null];
 assert.equal(advance(s,1/120).some(e=>e.type==='enemy-strike'),false);assert.equal(s.kills,1);
 s.equipment=[null,null,null];assert.equal(run(s,118/120).some(e=>e.type==='enemy-strike'),false);
 const hit=run(s,1/120).find(e=>e.type==='enemy-strike');assert.equal(hit?.enemyKind,'mushroom');
});
test('armored enemies retaliate harder and damage scales gently by stage',()=>{
 for(const [level,kills,damage]of [[3,3,12],[6,0,8],[6,3,14]]){
  const s=createGame();Object.assign(s,{level,kills,equipment:[null,null,null]});s.hp=targetHealth(s);
  assert.equal(run(s,1).find(e=>e.type==='enemy-strike')?.damage,damage);
 }
});
test('a new player can clear the first stage despite taking visible hits',()=>{
 const s=createGame();let hits=0;for(let i=0;i<60*120&&s.level===1&&s.status==='playing';i++)hits+=advance(s,1/120).filter(e=>e.type==='enemy-strike').length;
 assert.ok(hits>=5);assert.equal(s.level,2);assert.equal(s.status,'playing');assert.equal(s.survival.hp,100);
});
test('normal enemy attacks freeze in challenges and agree at 30 and 120 Hz',()=>{
 const s=createGame();s.bestEver=3;run(s,1);const before=structuredClone(s.survival);startChallenge(s,0);
 assert.equal(run(s,2).some(e=>e.type==='enemy-strike'),false);assert.deepEqual(s.survival,before);exitChallenge(s);
 const a=createGame(),b=createGame();run(a,12,30);run(b,12,120);assert.deepEqual(a.survival,b.survival);
});
test('more than twelve normal attacks remain valid saves and legacy v3 still loads',()=>{
 const values=new Map(),db={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},s=createGame();s.equipment=[null,null,null];run(s,55);
 assert.ok(s.survival.attackCount>12);saveGame(db,s);assert.equal(loadGame(db).blocked,false);
 delete s.survival.enemyStrikes;db.setItem(SAVE_KEY,JSON.stringify({version:3,state:s}));assert.equal(loadGame(db).blocked,false);
});
