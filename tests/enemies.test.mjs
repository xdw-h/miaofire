import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
const at=(level,kills=0)=>{const s=game.createGame();Object.assign(s,{level,kills,bestEver:level-1,bestThisRun:level-1,totalKills:(level-1)*10+kills});s.hp=game.targetHealth(s);return s;};
const run=(s,seconds,hz=120)=>{const events=[];for(let i=0;i<seconds*hz;i++)events.push(...game.advance(s,1/hz));return events;};

test('boss is the final encounter every five stages with four-and-a-half times base health',()=>{
 assert.equal(game.targetHealth(at(5,9)),Math.round(game.treeHealth(5)*4.5));
 assert.equal(game.targetHealth(at(10,9)),Math.round(game.treeHealth(10)*4.5));
 assert.equal(game.targetHealth(at(4,9)),game.treeHealth(4));
 assert.equal(game.targetHealth(at(5,8)),game.treeHealth(5));
});
test('encounter sequence alternates regular enemies and introduces armor at stage three',()=>{
 assert.equal(typeof game.currentEnemy,'function');
 assert.equal(game.currentEnemy(at(1,0)).kind,'slime');
 assert.equal(game.currentEnemy(at(1,1)).kind,'mushroom');
 assert.equal(game.currentEnemy(at(2,3)).armor,0);
 for(const kills of [3,7])assert.equal(game.currentEnemy(at(3,kills)).kind,'armored');
 assert.equal(game.currentEnemy(at(5,9)).kind,'boss');
});
test('armor reduces applied damage by 25 percent with a minimum of one',()=>{
 const s=at(3,3),before=s.hp;
 const shot=game.advance(s,1/120).find(e=>e.type==='shot');
 assert.equal(before-s.hp,3);assert.equal(shot.damage,3);assert.equal(shot.armored,true);
 assert.equal(typeof game.damageToEnemy,'function');
 assert.equal(game.damageToEnemy(1,{armor:.25}),1);
});
test('armored and boss kills use their coin multipliers',()=>{
 for(const [level,kills,multiplier] of [[3,3,1.5],[5,9,5]]){
  const s=at(level,kills);s.hp=1;const e=game.advance(s,1/120).find(e=>e.type==='kill');
  assert.equal(e.coins,Math.round((4+Math.floor(level*1.6))*multiplier));
 }
});
test('boss clear pays 20 gems and 10 fish once and gives a structured result',()=>{
 const s=at(5,9);s.hp=1;const events=game.advance(s,1/120);
 assert.equal(s.gems,50);assert.equal(s.fish,10);assert.equal(s.level,6);
 const result=events.find(e=>e.type==='level');assert.equal(result.boss,true);assert.deepEqual(result.reward,{gems:20,fish:10});
 run(s,.1);assert.equal(s.gems,50);assert.equal(s.fish,10);
});
test('boss timeout awards nothing and retry starts the same stage with a regular enemy',()=>{
 const s=at(5,9);s.elapsed=59.99;run(s,.1);
 assert.equal(s.status,'failed');assert.equal(s.gems,30);assert.equal(s.fish,0);
 game.retry(s);assert.equal(s.level,5);assert.equal(s.kills,0);assert.equal(s.hp,game.treeHealth(5));
});
test('shot and kill snapshots retain the exact enemy across a boss transition',()=>{
 const s=at(5,8);s.hp=1;const first=game.advance(s,1/120);
 assert.equal(first.find(e=>e.type==='shot').targetEnemy?.kind,'slime');
 assert.equal(first.find(e=>e.type==='kill').nextEnemy?.kind,'boss');
 assert.equal(s.hp,Math.round(game.treeHealth(5)*4.5));
 s.hp=1;s.cooldowns=[0,0,0];const second=game.advance(s,1/120);
 assert.equal(second.find(e=>e.type==='shot').targetEnemy?.kind,'boss');
 assert.equal(second.find(e=>e.type==='kill').nextEnemy?.kind,'slime');
});
test('boss battle is preserved through material challenges and v2 refresh retains progression',()=>{
 const s=at(5,9);s.hp=111;s.elapsed=12;s.fish=23;const before=JSON.stringify(s);
 game.startChallenge(s,0);run(s,1);assert.equal(game.targetHealth(s),1200);game.exitChallenge(s);assert.equal(JSON.stringify(s),before);
 const db={value:null,getItem(){return this.value;},setItem(k,v){if(k===SAVE_KEY)this.value=v;}};
 saveGame(db,s);const r=loadGame(db);assert.equal(r.blocked,false);assert.equal(r.state.fish,23);assert.equal(r.state.level,5);assert.equal(r.state.kills,0);assert.equal(r.state.hp,game.treeHealth(5));
});
test('armored and boss combat stay identical at 30 and 120 Hz',()=>{
 const a=at(5,0),b=at(5,0);a.upgrades.attack=8;b.upgrades.attack=8;
 run(a,35,30);run(b,35,120);
 for(const key of ['level','kills','hp','coins','gems','fish','totalKills'])assert.equal(a[key],b[key],key);
});
