import test from 'node:test';import assert from 'node:assert/strict';import * as game from '../src/game.mjs';import {saveGame,loadGame,SAVE_KEY} from '../src/storage.mjs';
const date=n=>new Date(2026,8,n,12);const setup=()=>{const s=game.createGame();s.bestEver=3;return s;};
function win(s){for(let i=0;i<12&&s.challenge.status==='playing';i++){const b=game.battleState(s);b.hp=1;b.cooldowns=[0,0,0];if(b.combat)b.combat.enemyShield=0;game.advance(s,1/120);}}
test('daily date rotates three fixed rules and normalizes stats independent of progression',()=>{
 assert.equal(typeof game.startDaily,'function');const kinds=new Set();
 for(let n=1;n<=3;n++){const s=setup();assert.equal(game.startDaily(s,date(n)).ok,true);kinds.add(s.challenge.rule);assert.equal(s.challenge.date,`2026-09-0${n}`);const low=game.stats(s).dps;const high=setup();high.crystals=1e6;high.upgrades.attack=60;game.startDaily(high,date(n));assert.equal(game.stats(high).dps,low);}
 assert.deepEqual(kinds,new Set(['duo','drought','bossrush']));
});
test('daily main state frozen; victory pays once per date and survives reload and rebirth',()=>{
 assert.equal(typeof game.startDaily,'function');const s=setup();const before=JSON.stringify(s);game.startDaily(s,date(1));game.advance(s,.1);game.exitChallenge(s);assert.equal(JSON.stringify(s),before);
 game.startDaily(s,date(1));win(s);assert.equal(s.challenge.status,'won');assert.equal(s.gems,50);assert.equal(s.fish,40);game.exitChallenge(s);game.startDaily(s,date(1));win(s);assert.equal(s.gems,50);assert.equal(s.challenge.reward,0);game.exitChallenge(s);
 const map=new Map(),db={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveGame(db,s);const r=loadGame(db).state;assert.equal(r.daily.lastClaimed,'2026-09-01');r.bestThisRun=3;game.rebirth(r);assert.equal(r.daily.lastClaimed,'2026-09-01');
 game.startDaily(r,date(2));win(r);assert.equal(r.gems,70);
});
test('daily timeout and abandoned run do not reward, restart uses selected date identity',()=>{
 assert.equal(typeof game.startDaily,'function');const s=setup();game.startDaily(s,date(1));const b=game.battleState(s);b.elapsed=59.999;game.advance(s,.1);assert.equal(s.challenge.status,'failed');assert.equal(s.daily.lastClaimed,null);assert.equal(s.gems,30);
 const map=new Map(),db={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};game.exitChallenge(s);game.startDaily(s,date(2));saveGame(db,s);assert.equal(loadGame(db).state.challenge,null);assert.equal(loadGame(db).state.gems,30);
});
test('duo limits squad, drought blocks automatic and weapon recovery but allows active shield; bossrush has three bosses',()=>{
 assert.equal(typeof game.startDaily,'function');for(let n=1;n<=3;n++){const s=setup();game.startDaily(s,date(n));const b=game.battleState(s);
 if(s.challenge.rule==='duo')assert.equal(game.stats(s).cats.filter(Boolean).length,2);
 if(s.challenge.rule==='drought'){b.survival.shield=0;game.advance(s,.25);assert.equal(b.survival.shield,0);assert.equal(game.castSkill(s,'shield').ok,true);assert.ok(b.survival.shield>0);}
 if(s.challenge.rule==='bossrush'){assert.equal(game.currentEnemy(s).kind,'boss');assert.equal(s.challenge.target,3);}
 }
});
test('invalid dates and future claim rollback cannot award duplicate currency',()=>{
 assert.equal(typeof game.startDaily,'function');const s=setup(),before=JSON.stringify(s);assert.equal(game.startDaily(s,new Date('bad')).ok,false);assert.equal(JSON.stringify(s),before);
 s.daily.lastClaimed='2026-09-03';game.startDaily(s,date(1));win(s);assert.equal(s.gems,30);
 const map=new Map(),db={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};game.exitChallenge(s);s.daily.lastClaimed='2026-02-30';db.setItem(SAVE_KEY,JSON.stringify({version:4,state:s}));assert.equal(loadGame(db).blocked,true);
});
test('all three daily rules need tactics and can be won with correctly timed skills',()=>{
 for(let day=1;day<=3;day++)for(const skills of [false,true]){
  const s=setup();game.startDaily(s,date(day));for(let i=0;i<7200&&s.challenge.status==='playing';i++){
   const b=game.battleState(s);if(skills){game.castSkill(s,'burst');if(b.survival.shield<20)game.castSkill(s,'shield');if(b.survival.hp<80)game.castSkill(s,'heal');}game.advance(s,1/120);
  }assert.equal(s.challenge.status,skills?'won':'failed',s.challenge.rule);
 }
});
test('daily fixed-step simulation and skill cooldowns match on 30/120 Hz',()=>{
 const a=setup(),b=setup();for(const s of [a,b]){game.startDaily(s,date(3));game.castSkill(s,'burst');}
 for(const [s,hz]of [[a,30],[b,120]])for(let i=0;i<20*hz;i++)game.advance(s,1/hz);
 assert.ok(Math.abs(a.challenge.run.accumulator-b.challenge.run.accumulator)<1e-9);
 assert.deepEqual({...a.challenge.run,accumulator:0},{...b.challenge.run,accumulator:0});
});
