import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance} from '../src/game.mjs';
import {attackPresentation,projectilePoint,ATTACK_STYLES} from '../src/enemy-attack-art.mjs';
test('retaliation flight precedes the damage event and disappears when it lands',()=>{
 const s=createGame();s.equipment=[null,null,null];s.survival.bossTime=.2;
 assert.equal(attackPresentation(s,'tree-0').phase,'windup');
 s.survival.bossTime=.8;const flight=attackPresentation(s,'tree-0');assert.equal(flight.phase,'flight');assert.ok(flight.progress>0&&flight.progress<1);assert.equal(s.survival.shield,60);
 s.survival.bossTime=1-1/120;const end=attackPresentation(s,'tree-0');assert.ok(end.progress>.95);
 const events=advance(s,1/120);assert.ok(events.some(e=>e.type==='enemy-strike'));assert.equal(s.survival.shield,56);assert.equal(attackPresentation(s,'tree-0').phase,'idle');
});
test('stale encounters, dead enemies and training dummies never emit a projectile',()=>{
 const s=createGame();s.survival.bossTime=.8;assert.equal(attackPresentation(s,'tree-previous'),null);
 s.status='failed';assert.equal(attackPresentation(s,'tree-0'),null);
 s.status='playing';s.challenge={};assert.equal(attackPresentation(s,'tree-0'),null);
});
test('each species trajectory starts at its source and lands at the defense contact point',()=>{
 const from={x:710,y:300},to={x:330,y:390};
 for(const style of Object.values(ATTACK_STYLES)){
  assert.deepEqual(projectilePoint(from,to,0,style.arc),from);
  const end=projectilePoint(from,to,1,style.arc);assert.equal(end.x,to.x);assert.ok(Math.abs(end.y-to.y)<1e-9);
 }
});
test('boss flight stays within its existing two-second windup',()=>{
 const s=createGame();s.level=5;s.kills=9;s.survival.bossTime=2.9;
 assert.equal(attackPresentation(s,'tree-0').phase,'idle');s.survival.bossTime=3.5;assert.equal(attackPresentation(s,'tree-0').phase,'windup');
 s.survival.bossTime=4.8;assert.equal(attackPresentation(s,'tree-0').phase,'flight');
});
