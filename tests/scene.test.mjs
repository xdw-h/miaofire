import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, advance, targetHealth,TYPES} from '../src/game.mjs';
import {ForestScene} from '../src/scene.mjs';

function makeScene(t) {
  const globals = {
    matchMedia: () => ({matches: false}),
    ResizeObserver: class {observe() {}},
    devicePixelRatio: 1,
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
    t.after(() => previous
      ? Object.defineProperty(globalThis, key, previous)
      : delete globalThis[key]);
  }
  // Native Canvas calls are irrelevant to game timing; retain filter save/restore
  // so the assertions observe what the actual draw method applies to each tree.
  const savedFilters = [];
  const ctx = new Proxy({
    filter: 'none',
    save() { savedFilters.push(this.filter); },
    restore() { this.filter = savedFilters.pop(); },
    createLinearGradient: () => ({addColorStop() {}}),
  }, {get: (object, key) => key in object ? object[key] : (() => {})});
  const canvas = {
    getContext: () => ctx,
    getBoundingClientRect: () => ({width: 1000, height: 625}),
  };
  const scene = new ForestScene(canvas), rendered = [];
  const drawEnemy = scene.enemy;
  scene.enemy = function (x, y, enemy, time) {
    rendered.push({level:enemy.level,kind:enemy.kind,filter:ctx.filter,shake:this.shake});
    return drawEnemy.call(this,x,y,enemy,time);
  };
  return {scene, rendered};
}

function crossLevel(scene) {
  const state = createGame();
  Object.assign(state, {
    level: 5, bestEver: 4, bestThisRun: 4,
    kills: 9, totalKills: 49, hp: 5,
  });
  for (const event of advance(state, 1 / 120)) scene.event(event);
  assert.equal(state.level, 6, 'the simulation has already advanced to the next stage');
  return state;
}

test('last projectile retains the old stage tree until its delayed kill arrives', t => {
  const {scene, rendered} = makeScene(t), state = crossLevel(scene);
  scene.draw(state, .1, false);
  assert.equal(rendered.at(-1).level, 5, 'old tree must remain while the projectile is flying');
  scene.draw(state, .05, false);
  assert.equal(rendered.at(-1).level, 6, 'next tree enters after the old target is destroyed');
});

test('last projectile flash and shake do not transfer to the next tree', t => {
  const {scene, rendered} = makeScene(t), state = crossLevel(scene);
  scene.draw(state, .1, false);
  scene.draw(state, .05, false);
  assert.equal(rendered.at(-1).level, 6);
  assert.equal(rendered.at(-1).filter, 'none', 'new tree must not inherit the old shot brightness');
  assert.equal(rendered.at(-1).shake, 0, 'new tree must not inherit the old shot shake');
});

test('resetEffects discards the visual target and pending impacts before a new battle', t => {
  const {scene, rendered} = makeScene(t), state = crossLevel(scene);
  scene.draw(state, .1, false);
  scene.resetEffects();
  assert.equal(scene.targetLevel, null);
  assert.equal(scene.targetEnemy,null);
  assert.equal(scene.impacts.targetId, null);
  assert.deepEqual(scene.impacts.queue, []);
  scene.draw(createGame(), .1, false);
  assert.equal(rendered.at(-1).level, 1, 'a fresh battle must not reuse the prior stage tree');
  assert.equal(rendered.at(-1).filter, 'none');
  assert.equal(rendered.at(-1).shake, 0);
});

test('armor and boss silhouettes change only when the previous hit arrives',t=>{
 for(const [level,kills,nextKind] of [[3,2,'armored'],[5,8,'boss']]){
  const {scene,rendered}=makeScene(t),s=createGame();s.level=level;s.kills=kills;s.hp=targetHealth(s);
  scene.draw(s,0,false);assert.equal(rendered.at(-1).kind,'slime');
  s.hp=1;for(const event of advance(s,1/120))scene.event(event);
  scene.draw(s,.1,false);assert.equal(rendered.at(-1).kind,'slime');
  scene.draw(s,.05,false);assert.equal(rendered.at(-1).kind,nextKind);
 }
});

test('multiple kills in one frame retain each target stage across a stage boundary', t => {
  const {scene, rendered} = makeScene(t), state = createGame();
  Object.assign(state, {
    level: 5, bestEver: 4, bestThisRun: 4,
    kills: 8, totalKills: 48, hp: 1,
    inventory: [1, 2, 3].map(id => ({id: `w${id}`, type: 'pistol', tier: 0})),
    equipment: ['w1', 'w2', 'w3'], nextId: 4,
  });
  state.upgrades.attack = 40;
  const events = advance(state, 1 / 120);
  assert.deepEqual(events.filter(e => e.type === 'shot').map(e => e.targetLevel), [5, 5, 6]);
  assert.deepEqual(events.filter(e => e.type === 'kill').map(e => e.nextLevel), [5, 6, 6]);
  for (const event of events) scene.event(event);
  scene.draw(state, .1, false);
  assert.equal(rendered.at(-1).level, 5);
  scene.draw(state, .05, false);
  assert.equal(rendered.at(-1).level, 6);
  assert.equal(rendered.at(-1).filter, 'none');
  assert.equal(scene.impacts.targetId, 'tree-51');
});
test('boss strike feedback freezes when paused and clears when a battle changes',t=>{
 const {scene}=makeScene(t),s=createGame();
 scene.event({type:'boss-strike',shieldDamage:40,healthDamage:0,shieldBroken:false});
 assert.ok(scene.teamHit>0);const effect=scene.teamHit;
 scene.draw(s,.1,true);assert.equal(scene.teamHit,effect);
 scene.draw(s,.1,false);assert.ok(scene.teamHit<effect);
 scene.resetEffects();assert.equal(scene.teamHit,0);
});
test('regular retaliation produces readable attack feedback and freezes while paused',t=>{
 const {scene}=makeScene(t),s=createGame();
 scene.event({type:'enemy-strike',enemyKind:'slime',enemyName:'苔团',targetId:'tree-0',shieldDamage:4,healthDamage:0});
 assert.ok(scene.teamHit>0);assert.match(scene.attackText,/苔团反击/);assert.ok(scene.attackFlash>0);
 const before=scene.attackFlash;scene.draw(s,.1,true);assert.equal(scene.attackFlash,before);
 scene.draw(s,.1,false);assert.ok(scene.attackFlash<before);scene.resetEffects();assert.equal(scene.attackFlash,0);
});
test('scene freezes an in-flight attack and suppresses attacks while displaying an old enemy',t=>{
 const {scene}=makeScene(t),s=createGame(),views=[];s.survival.bossTime=.8;
 scene.attackFlight=(view)=>views.push(structuredClone(view));scene.draw(s,0,false);
 assert.equal(views.at(-1).phase,'flight');const before=views.at(-1);scene.draw(s,.1,true);assert.deepEqual(views.at(-1),before);
 scene.impacts.targetId='tree-previous';const count=views.length;scene.draw(s,0,false);assert.equal(views.length,count);
});

test('all weapon projectiles and ward pulses freeze and render in both motion modes',t=>{
 for(const type of Object.keys(TYPES))for(const reduce of [false,true]){
  const {scene}=makeScene(t),s=createGame();scene.reduceMotion=reduce;s.inventory[0].type=type;s.level=10;s.hp=targetHealth(s);s.survival.shield=0;s.survival.damageAgo=0;
  for(const event of advance(s,1/120))scene.event(event);
  const bullet=scene.particles.find(p=>p.type==='bullet');assert.ok(Number.isFinite(bullet.x)&&Number.isFinite(bullet.y));
  const before=JSON.stringify(scene.particles);scene.draw(s,.1,true);assert.equal(JSON.stringify(scene.particles),before);
  if(type==='ward')assert.ok(scene.particles.some(p=>p.type==='shield-charge'));
  for(let i=0;i<12;i++)scene.draw(s,.05,false);
  assert.equal(scene.particles.some(p=>p.type==='bullet'),false);
  scene.resetEffects();assert.equal(scene.particles.length,0);
 }
});
