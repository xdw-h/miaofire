import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, createGame, startChallenge, stats } from '../src/game.mjs';
import { enemyAttack } from '../src/survival.mjs';
import {
  PETS,
  PET_IDS,
  claimPet,
  carryPet,
  feedPet,
  petBonus,
} from '../src/progression.mjs';
import {
  castPetSkill,
  evolvePet,
  evolutionDefaults,
  tickPetSkill,
} from '../src/evolutions.mjs';

function unlockAt(stage, id) {
  const state = createGame();
  state.bestEver = stage;
  state.bestThisRun = stage;
  state.fish = 200;
  assert.equal(claimPet(state, id).ok, true);
  return state;
}

test('伙伴目录包含三只新伙伴及对应解锁关卡', () => {
  assert.deepEqual(PET_IDS, ['squirrel', 'bird', 'raccoon', 'stoneTurtle', 'moonRabbit', 'starFox']);
  assert.equal(PETS.stoneTurtle.unlock, 6);
  assert.equal(PETS.moonRabbit.unlock, 8);
  assert.equal(PETS.starFox.unlock, 10);
});

test('新伙伴按关卡解锁并可喂养到 10 级', () => {
  const turtle = unlockAt(6, 'stoneTurtle');
  assert.equal(turtle.pets.stoneTurtle, 1);
  assert.equal(feedPet(turtle, 'stoneTurtle').ok, true);
  turtle.pets.stoneTurtle = 9;
  assert.equal(feedPet(turtle, 'stoneTurtle').ok, true);
  assert.equal(turtle.pets.stoneTurtle, 10);
  assert.ok(turtle.fish < 200);
});

test('防御伙伴降低小怪伤害，恢复伙伴提高生命与护盾恢复', () => {
  const plain = createGame();
  plain.level = 20;
  const turtle = unlockAt(6, 'stoneTurtle');
  turtle.level = 20;
  assert.equal(carryPet(turtle, 'stoneTurtle').ok, true);
  assert.ok(enemyAttack(turtle).damage < enemyAttack(plain).damage);

  const rabbit = unlockAt(8, 'moonRabbit');
  assert.equal(carryPet(rabbit, 'moonRabbit').ok, true);
  rabbit.survival.hp = 40;
  rabbit.survival.shield = 0;
  rabbit.survival.lastDamageAt = -999;
  rabbit.survival.damageAgo = 3;
  const before = { hp: rabbit.survival.hp, shield: rabbit.survival.shield };
  assert.ok(stats(rabbit).recovery > 0);
  advance(rabbit, 1);
  assert.ok(rabbit.survival.hp > before.hp);
  assert.ok(rabbit.survival.shield > before.shield);
});

test('星狐在 Boss 战提高武器伤害系数', () => {
  const plain = createGame();
  plain.bestEver = 10;
  plain.level = 10;
  plain.kills = 9;
  const fox = structuredClone(plain);
  fox.fish = 200;
  assert.equal(claimPet(fox, 'starFox').ok, true);
  assert.equal(carryPet(fox, 'starFox').ok, true);
  assert.ok(stats(fox).boss > 0);
  assert.ok(stats(fox).attack >= stats(plain).attack);
});

test('伙伴 10 级可选择一次进化分支并获得对应技能', () => {
  const state = unlockAt(10, 'squirrel');
  state.pets.squirrel = 10;
  Object.assign(state, evolutionDefaults());
  assert.equal(evolvePet(state, 'squirrel', 'attack').ok, true);
  assert.equal(state.petEvolution.squirrel, 'attack');
  assert.equal(evolvePet(state, 'squirrel', 'guardian').ok, false);
  assert.ok(petBonus({ ...state, activePet: 'squirrel' }).attack > 1.08);

  assert.equal(carryPet(state, 'squirrel').ok, true);
  assert.equal(castPetSkill(state).ok, true);
  assert.ok(state.petSkillCooldown.squirrel > 0);
  assert.equal(castPetSkill(state).ok, false);
  const cooldown = state.petSkillCooldown.squirrel;
  carryPet(state, 'bird');
  assert.equal(state.petSkillCooldown.squirrel, cooldown);
  tickPetSkill(state, 1);
  assert.equal(state.petSkillCooldown.squirrel, cooldown - 1);
});

test('固定挑战实例不继承主线携带伙伴与技能状态', () => {
  const state = unlockAt(10, 'squirrel');
  state.pets.squirrel = 10;
  Object.assign(state, evolutionDefaults());
  carryPet(state, 'squirrel');
  evolvePet(state, 'squirrel', 'attack');
  assert.equal(castPetSkill(state).ok, true);
  const challenge = startChallenge(state, 0);
  assert.equal(challenge.ok, true);
  assert.equal(state.challenge.activePet, null);
  assert.deepEqual(state.challenge.petEvolution, evolutionDefaults().petEvolution);
  assert.deepEqual(state.challenge.petSkillCooldown, evolutionDefaults().petSkillCooldown);
});
