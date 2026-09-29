import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,advance,targetHealth} from '../src/game.mjs';
import {enemyAttack} from '../src/survival.mjs';
import {enemyFor,baseHealth} from '../src/enemies.mjs';
const run=(s,n)=>{const ev=[];for(let i=0;i<n*120;i++)ev.push(...advance(s,1/120));return ev;};
function squad(level,attack,defense){const s=createGame();Object.assign(s,{level,bestEver:level-1,bestThisRun:level-1});s.hp=targetHealth(s);s.inventory=[1,2,3].map(i=>({id:`w${i}`,type:'pistol',tier:0}));s.equipment=['w1','w2','w3'];s.nextId=4;Object.assign(s.upgrades,{attack,speed:2,health:defense,shield:defense});s.survival.hp=100+defense*20;s.survival.shield=60+defense*15;return s;}
test('opening stages keep light damage while later stages apply sustained pressure',()=>{
 const s=createGame();assert.equal(enemyAttack(s).damage,4);s.level=3;assert.equal(enemyAttack(s).damage,6);s.survival.enemyStrikes=1;assert.equal(enemyAttack(s).cycle,3.5);s.level=8;assert.equal(enemyAttack(s).cycle,3);
 assert.equal(baseHealth(1),20);assert.ok(baseHealth(10)>Math.round(20*1.36**9));assert.equal(enemyFor(5,9).hp,Math.round(baseHealth(5)*4.5));
});
test('advanced stages recover four shield per second after the existing delay',()=>{
 const s=createGame();s.level=3;s.survival.shield=0;s.survival.damageAgo=3;s.equipment=[null,null,null];run(s,.5);assert.ok(Math.abs(s.survival.shield-2)<1e-8);
});
test('boss starts at three seconds and half-health rage strengthens damage without changing deadline',()=>{
 const s=createGame();s.level=5;s.kills=9;s.hp=targetHealth(s);s.equipment=[null,null,null];assert.equal(enemyAttack(s).cycle,3);
 assert.equal(run(s,3).filter(e=>e.type==='boss-strike').length,1);assert.equal(enemyAttack(s).cycle,5);
 s.hp=targetHealth(s)*.5;assert.equal(enemyAttack(s).enraged,true);assert.equal(enemyAttack(s).damage,56);assert.equal(enemyAttack(s).cycle,5);
});
test('ten-stage defense investment with three earned blessings wins where attack-only falls',()=>{
 const glass=squad(10,8,0),balanced=squad(10,6,4);
 for(const s of [glass,balanced])s.expedition={milestone:9,pending:null,choices:['attack','speed','hunter']};
 run(glass,60);run(balanced,60);
 assert.equal(glass.status,'failed');assert.equal(glass.failureReason,'defeat');assert.ok(balanced.level>10);
});
