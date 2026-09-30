import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';
import {advanceSurvival,enemyAttack,enemyCharging} from '../src/survival.mjs';
import {attackPresentation} from '../src/enemy-attack-art.mjs';

function setup(){const s=game.createGame();s.bestEver=5;return s;}
function start(){const s=setup();assert.equal(typeof game.startEndless,'function');assert.equal(game.startEndless(s).ok,true);return s;}
function kill(s){const b=game.battleState(s);b.hp=1;b.cooldowns=[0,0,0];b.combat.enemyShield=0;return game.advance(s,1/120);}
function main(s){const {challenge,endless,...rest}=s;return rest;}

test('endless requires stage 5 and idle challenge and blessing slots',()=>{
 assert.equal(typeof game.startEndless,'function');const s=game.createGame();assert.equal(game.startEndless(s).ok,false);
 s.bestEver=5;s.expedition.pending=['attack'];assert.equal(game.startEndless(s).ok,false);s.expedition.pending=null;
 assert.equal(game.startEndless(s).ok,true);const before=structuredClone(s);assert.equal(game.startEndless(s).ok,false);assert.deepEqual(s,before);
});
test('fixed B squad ignores all main advantages and delegates battle helpers',()=>{
 const a=start(),b=setup();b.upgrades={attack:60,speed:30,income:60,health:30,shield:30};b.crystals=1000;b.gems=500;b.coins=9999;
 b.pets.squirrel=20;b.activePet='squirrel';b.expedition.choices=['attack','speed','barrier','hunter'];b.inventory[0].tier=4;
 assert.equal(game.startEndless(b).ok,true);assert.deepEqual(game.stats(a),game.stats(b));assert.deepEqual(game.battleState(a),game.battleState(b));
 assert.equal(game.stats(a).cats.filter(Boolean).length,3);assert.ok(game.stats(a).cats.every(c=>c.tier===1));assert.equal(game.targetId(a),'endless-0');
 assert.deepEqual(a.challenge.run.endlessRun,{waves:0,pending:false});assert.equal(game.currentEnemy(a).kind,'slime');assert.ok(enemyAttack(a));
});
test('waves preserve defense and cooldowns, record highscore, and pause after every fifth boss',()=>{
 const s=start(),b=game.battleState(s);b.survival.hp=67;b.survival.shield=13;b.survival.damageAgo=0;game.castSkill(s,'burst');
 const events=kill(s);assert.equal(b.endlessRun.waves,1);assert.equal(s.endless.bestWaves,1);assert.equal(b.elapsed,0);assert.equal(b.survival.hp,67);assert.equal(b.survival.shield,13);
 assert.ok(b.skills.cooldowns.burst>21);assert.ok(events.some(e=>e.type==='endless-wave'&&e.waves===1));assert.equal(game.targetId(s),'endless-1');
 for(let i=0;i<3;i++)kill(s);assert.equal(game.currentEnemy(s).kind,'boss');const fifth=kill(s);
 assert.equal(b.endlessRun.pending,true);assert.equal(b.endlessRun.waves,5);assert.ok(fifth.some(e=>e.type==='endless-choice'));
 const paused=structuredClone(b);game.advance(s,.25);advanceSurvival(b,.25);assert.equal(game.castSkill(s,'shield').ok,false);assert.deepEqual(b,paused);
 assert.equal(enemyCharging(s),false);assert.equal(attackPresentation(s,game.targetId(s)),null);
});
test('choices require pending state and apply distinct effects exactly once',()=>{
 for(const id of ['power','tempo','repair']){const s=start(),b=game.battleState(s);assert.equal(game.chooseEndless(s,id).ok,false);for(let i=0;i<5;i++)kill(s);
  b.survival.hp=20;b.survival.shield=0;const old=game.stats(s),before=structuredClone(b);assert.equal(game.chooseEndless(s,'invalid').ok,false);assert.deepEqual(b,before);
  assert.equal(game.chooseEndless(s,id).ok,true);assert.equal(b.endlessRun.pending,false);const updated=game.stats(s);
  if(id==='power')assert.ok(updated.cats[0].damage>old.cats[0].damage);if(id==='tempo')assert.ok(updated.cats[0].rate>old.cats[0].rate);
  if(id==='repair'){assert.ok(b.survival.hp>20);assert.ok(b.survival.shield>0);}
  const once=structuredClone(b);assert.equal(game.chooseEndless(s,id).ok,false);assert.deepEqual(b,once);
  for(let i=0;i<5;i++)kill(s);assert.equal(b.endlessRun.pending,true);assert.equal(b.endlessRun.waves,10);
 }
});
test('failure reports once, skills affect trial only, and exit restores frozen main with best score',()=>{
 const s=setup(),before=structuredClone(main(s));game.startEndless(s);const b=game.battleState(s);b.survival.hp=50;b.survival.shield=0;
 assert.equal(game.castSkill(s,'heal').ok,true);assert.ok(b.survival.hp>50);assert.equal(game.castSkill(s,'shield').ok,true);assert.ok(b.survival.shield>0);
 kill(s);b.elapsed=59.999;const events=game.advance(s,.1);assert.equal(b.failureReason,'timeout');assert.equal(s.challenge.status,'failed');
 assert.equal(events.filter(e=>e.type==='challenge-result').length,1);assert.deepEqual(game.advance(s,.1),[]);assert.deepEqual(main(s),before);
 assert.equal(game.exitChallenge(s).ok,true);assert.equal(s.endless.bestWaves,1);assert.deepEqual(main(s),before);
 game.startEndless(s);game.exitChallenge(s);assert.equal(s.endless.bestWaves,1);
});
test('defeat has endless target events and mirrors wrapper failure',()=>{
 const s=start(),b=game.battleState(s);b.cooldowns=[99,99,99];b.survival.hp=1;b.survival.shield=0;b.survival.damageAgo=0;b.survival.bossTime=.999;
 const view=attackPresentation(s,game.targetId(s));assert.ok(view);const events=game.advance(s,1/120);assert.equal(s.challenge.status,'failed');assert.equal(b.failureReason,'defeat');
 assert.ok(events.some(e=>e.type==='enemy-strike'&&e.targetId==='endless-0'));assert.equal(events.filter(e=>e.type==='challenge-result').length,1);
});
test('endless combat and cooldowns are identical at 30 and 120 Hz',()=>{
 const a=start(),b=start();for(const s of [a,b])game.castSkill(s,'burst');
 for(const [s,hz] of [[a,30],[b,120]])for(let i=0;i<20*hz;i++)game.advance(s,1/hz);
 assert.deepEqual({...a.challenge.run,accumulator:0},{...b.challenge.run,accumulator:0});assert.equal(a.endless.bestWaves,b.endless.bestWaves);
});

function simulate({choice='power',skills=false,hz=120}={}){
 const s=start();let seconds=0;
 for(let i=0;i<300*hz&&s.challenge.status==='playing';i++){
  const b=game.battleState(s);if(b.endlessRun.pending)game.chooseEndless(s,choice);
  if(skills){game.castSkill(s,'burst');if(b.survival.shield<45)game.castSkill(s,'shield');if(b.survival.hp<100)game.castSkill(s,'heal');}
  game.advance(s,1/hz);seconds+=1/hz;
 }
 return {s,seconds};
}
test('natural combat reaches choices, eventually defeats, and tactical skills improve survival',()=>{
 for(const choice of ['power','tempo','repair']){
  const passive=simulate({choice}),active=simulate({choice,skills:true});
  assert.equal(passive.s.challenge.status,'failed');assert.equal(active.s.challenge.status,'failed');
  assert.ok(passive.s.endless.bestWaves>=5&&passive.s.endless.bestWaves<=20);
  assert.ok(active.s.endless.bestWaves>passive.s.endless.bestWaves);
  assert.ok(active.seconds>30&&active.seconds<180);
 }
});
test('multiple choice pauses and final defeat match at 30 and 120 Hz',()=>{
 const a=simulate({hz:30}).s,b=simulate({hz:120}).s;
 assert.equal(a.challenge.status,'failed');assert.ok(a.endless.bestWaves>=10);assert.deepEqual(a,b);
});
test('ordinary waves preserve weapon cooldowns as well as active skills',()=>{
 const s=start(),b=game.battleState(s);b.hp=1;b.cooldowns=[0,8,9];const rate=game.stats(s).cats[0].rate;
 game.advance(s,1/120);assert.equal(b.endlessRun.waves,1);assert.ok(Math.abs(b.cooldowns[0]-(1/rate-1/120))<1e-9);
 assert.ok(Math.abs(b.cooldowns[1]-(8-1/120))<1e-9);assert.ok(Math.abs(b.cooldowns[2]-(9-1/120))<1e-9);
});
