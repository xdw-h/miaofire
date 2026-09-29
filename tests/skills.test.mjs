import test from 'node:test';import assert from 'node:assert/strict';import * as game from '../src/game.mjs';
const run=(s,n)=>{const es=[];for(let i=0;i<n*120;i++)es.push(...game.advance(s,1/120));return es;};
test('shield and heal give bounded immediate recovery with independent cooldowns',()=>{
 const s=game.createGame();assert.equal(typeof game.castSkill,'function');s.survival.shield=0;s.survival.hp=20;
 assert.equal(game.castSkill(s,'shield').ok,true);assert.equal(s.survival.shield,30);assert.equal(s.skills.cooldowns.shield,18);
 assert.equal(game.castSkill(s,'heal').ok,true);assert.equal(s.survival.hp,45);assert.equal(s.skills.cooldowns.heal,25);
 const before=JSON.stringify(s);assert.equal(game.castSkill(s,'shield').ok,false);assert.equal(JSON.stringify(s),before);
});
test('burst increases damage for five seconds and expires on simulation time',()=>{
 const s=game.createGame();assert.equal(typeof game.castSkill,'function');s.level=20;s.hp=1e6;game.castSkill(s,'burst');
 const shot=game.advance(s,1/120).find(e=>e.type==='shot');assert.equal(shot.damage,8);assert.ok(s.skills.burst>0);run(s,5);assert.equal(s.skills.burst,0);
});
test('pending blessing and defeated battles block skills, main cooldown freezes in challenge',()=>{
 const s=game.createGame();assert.equal(typeof game.castSkill,'function');s.bestEver=3;s.skills.cooldowns.heal=20;const before=JSON.stringify(s.skills);game.startChallenge(s,0);game.castSkill(s,'burst');run(s,1);assert.equal(JSON.stringify(s.skills),before);game.exitChallenge(s);
 s.expedition.pending={stage:3,options:['speed','attack','barrier']};assert.equal(game.castSkill(s,'burst').ok,false);s.expedition.pending=null;s.status='failed';assert.equal(game.castSkill(s,'burst').ok,false);
});
test('retry resets skill cooldowns while new stages keep them to prevent burst spam',()=>{
 const s=game.createGame();assert.equal(typeof game.castSkill,'function');game.castSkill(s,'burst');s.kills=9;s.hp=1;game.advance(s,1/120);assert.ok(s.skills.cooldowns.burst>0);s.status='failed';game.retry(s);assert.equal(s.skills.cooldowns.burst,0);
});
