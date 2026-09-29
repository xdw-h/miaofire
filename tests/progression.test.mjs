import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stats,advance,rebirth,upgrade,drawWeapon,equipWeapon,unequipWeapon,mergeWeapons,startChallenge,exitChallenge,challengeReward} from '../src/game.mjs';
import {claimPet,carryPet,feedPet,claimMilestone,petBonus,feedCost} from '../src/progression.mjs';
const step = (s,seconds) => {const e=[];for(let i=0;i<seconds*120;i++)e.push(...advance(s,1/120));return e;};
const ready = () => {const s=createGame();s.bestEver=5;s.bestThisRun=5;s.level=6;return s;};

test('pet claims require progress and cannot be repeated',()=>{
 const s=createGame();assert.equal(claimPet(s,'squirrel').ok,false);s.bestEver=1;
 assert.equal(claimPet(s,'squirrel').ok,true);assert.equal(s.pets.squirrel,1);
 const before=JSON.stringify(s);assert.equal(claimPet(s,'squirrel').ok,false);assert.equal(claimPet(s,'bogus').ok,false);assert.equal(JSON.stringify(s),before);
});
test('feeding charges exact fish cost, caps at 20, and cannot overdraft',()=>{
 const s=ready();claimPet(s,'squirrel');assert.equal(feedCost(s,'squirrel'),15);
 assert.equal(feedPet(s,'squirrel').ok,false);s.fish=15;assert.equal(feedPet(s,'squirrel').ok,true);assert.equal(s.fish,0);assert.equal(s.pets.squirrel,2);
 s.fish=100000;for(let i=0;i<30;i++)feedPet(s,'squirrel');assert.equal(s.pets.squirrel,20);
 const before=JSON.stringify(s);assert.equal(feedPet(s,'squirrel').ok,false);assert.equal(JSON.stringify(s),before);
});
test('only carried pet changes its intended stat',()=>{
 const s=ready(),base=stats(s);for(const id of ['squirrel','bird','raccoon'])claimPet(s,id);
 assert.equal(stats(s).dps,base.dps);assert.equal(carryPet(s,'bogus').ok,false);
 carryPet(s,'bird');assert.ok(stats(s).speed>base.speed);assert.equal(stats(s).attack,base.attack);
 carryPet(s,'raccoon');assert.ok(stats(s).income>base.income);assert.equal(stats(s).speed,base.speed);
 carryPet(s,'squirrel');assert.ok(stats(s).attack>base.attack);assert.equal(stats(s).income,base.income);
 assert.equal(petBonus(s).attack,1.08);carryPet(s,null);assert.equal(stats(s).attack,base.attack);
});
test('milestones reward once based on lifetime progress and survive rebirth',()=>{
 const s=ready();s.totalKills=50;assert.equal(claimMilestone(s,'kills10').ok,true);assert.equal(s.fish,15);
 assert.equal(claimMilestone(s,'kills10').ok,false);assert.equal(claimMilestone(s,'kills150').ok,false);
 claimPet(s,'squirrel');carryPet(s,'squirrel');rebirth(s);
 assert.equal(s.fish,15);assert.equal(s.pets.squirrel,1);assert.equal(s.activePet,'squirrel');assert.equal(claimMilestone(s,'kills10').ok,false);
});
test('normal stage completion rewards three fish once',()=>{
 const s=createGame();step(s,20);assert.equal(s.bestEver,1);assert.equal(s.fish,3);
});
test('challenge unlocks sequentially and preserves main battle on exit',()=>{
 const s=createGame();assert.equal(startChallenge(s,0).ok,false);s.bestEver=3;
 assert.equal(startChallenge(s,1).ok,false);s.hp=8;s.elapsed=17;s.kills=2;s.cooldowns=[.2,.4,.6];
 const before=JSON.stringify(s);assert.equal(startChallenge(s,0).ok,true);step(s,3);
 assert.equal(s.hp,8);assert.equal(s.elapsed,17);assert.equal(s.kills,2);assert.deepEqual(s.cooldowns,[.2,.4,.6]);
 exitChallenge(s);assert.equal(JSON.stringify(s),before);
});
test('first clear and repeat reward are distinct and never paid twice',()=>{
 const s=ready();s.upgrades.attack=30;const coins=s.coins,gems=s.gems,kills=s.totalKills;
 assert.equal(challengeReward(s,0),30);startChallenge(s,0);const events=step(s,1);
 assert.equal(s.challenge.status,'won');assert.equal(s.fish,30);assert.equal(s.challengeClears,1);
 assert.equal(events.filter(e=>e.type==='challenge-result').length,1);step(s,4);assert.equal(s.fish,30);
 assert.equal(s.coins,coins);assert.equal(s.gems,gems);assert.equal(s.totalKills,kills);
 exitChallenge(s);assert.equal(challengeReward(s,0),10);startChallenge(s,0);step(s,1);assert.equal(s.fish,40);
});
test('failed or abandoned challenge pays nothing',()=>{
 const s=ready();startChallenge(s,0);step(s,31);assert.equal(s.challenge.status,'failed');assert.equal(s.fish,0);
 exitChallenge(s);startChallenge(s,0);step(s,1);exitChallenge(s);assert.equal(s.fish,0);assert.equal(s.challengeClears,0);
});
test('challenge locks every loadout and progression transaction',()=>{
 const s=ready();s.coins=1000;s.fish=100;claimPet(s,'squirrel');drawWeapon(s,()=>0);drawWeapon(s,()=>0);startChallenge(s,0);
 const before=JSON.stringify(s);
 for(const run of [()=>upgrade(s,'attack'),()=>drawWeapon(s),()=>equipWeapon(s,'w2',1),()=>unequipWeapon(s,0),()=>mergeWeapons(s,'w2','w3'),()=>rebirth(s),()=>feedPet(s,'squirrel'),()=>carryPet(s,'squirrel'),()=>claimPet(s,'bird'),()=>claimMilestone(s,'stage3')])assert.equal(run().ok,false);
 assert.equal(JSON.stringify(s),before);
});
test('projectiles carry target identities and scatter only damages once',()=>{
 const s=createGame();s.inventory[0].type='shotgun';const events=advance(s,1/60),shot=events.find(e=>e.type==='shot');
 assert.ok(shot.targetId);assert.equal(s.hp,8);assert.equal(events.filter(e=>e.type==='shot').length,1);
 const later=step(s,3),kill=later.find(e=>e.type==='kill');assert.equal(kill.targetId,shot.targetId);assert.notEqual(kill.nextTargetId,shot.targetId);
});
test('challenge combat is identical at 30 and 120 Hz',()=>{
 const a=ready(),b=ready();startChallenge(a,0);startChallenge(b,0);
 for(let i=0;i<300;i++)advance(a,1/30);for(let i=0;i<1200;i++)advance(b,1/120);
 assert.equal(a.challenge.hp,b.challenge.hp);assert.equal(a.fish,b.fish);
});
