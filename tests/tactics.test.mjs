import test from 'node:test';import assert from 'node:assert/strict';
import * as game from '../src/game.mjs';import {enemyFor} from '../src/enemies.mjs';import {enemyAttack} from '../src/survival.mjs';
const run=(s,n)=>{const e=[];for(let i=0;i<n*120;i++)e.push(...game.advance(s,1/120));return e;};
function setup(types,level=10,kills=0){const s=game.createGame();s.level=level;s.bestThisRun=level-1;s.bestEver=level-1;s.inventory=types.map((type,i)=>({id:`w${i+1}`,type,tier:0}));s.equipment=Array.from({length:3},(_,i)=>s.inventory[i]?.id||null);s.nextId=types.length+1;game.restartBattle(s);s.kills=kills;s.hp=game.targetHealth(s);return s;}
test('crossbow mark amplifies sniper only on the same living target',()=>{
 const s=setup(['crossbow','sniper']);const shots=game.advance(s,1/120).filter(e=>e.type==='shot');
 assert.equal(shots[1].damage,Math.floor(18*1.3));assert.equal(s.combat.markTime,4);
 s.hp=1;s.cooldowns=[0,0,10];const more=game.advance(s,1/120).filter(e=>e.type==='shot');assert.equal(more[1].damage,18);
});
test('ward charges rocket and loadout changes clear links without restoring enemy shield',()=>{
 const s=setup(['ward','rocket']);const shots=game.advance(s,1/120).filter(e=>e.type==='shot');assert.equal(shots[1].damage,Math.floor(24*1.1));assert.equal(s.combat.charge,0);
 s.cooldowns=[0,10,10];game.advance(s,1/120);assert.equal(s.combat.charge,1);game.unequipWeapon(s,0);assert.equal(s.combat.charge,0);
});
test('pistol and smg pairing increases their actual rates only',()=>{
 const s=setup(['pistol','smg','shotgun']);const cats=game.stats(s).cats;assert.equal(cats[0].rate,2*1.08);assert.equal(cats[1].rate,3.6*1.08);assert.equal(cats[2].rate,.95);
});
test('elites have deterministic traits, extra rewards and no boss overlap',()=>{
 const found=new Set();for(let stage=4;stage<=9;stage++)for(const kills of [2,5]){const e=enemyFor(stage,kills);assert.ok(e.elite);assert.equal(e.coinMultiplier,1.8);found.add(e.elite);}
 assert.equal(found.size,3);assert.equal(enemyFor(3,2).elite,undefined);assert.equal(enemyFor(5,9).elite,undefined);
});
test('elite barrier absorbs damage; equip does not refill it',()=>{
 let pos;for(let l=4;l<8;l++)if(enemyFor(l,2).elite==='barrier')pos=l;assert.ok(pos);
 const s=setup(['pistol'],pos,2),before=s.hp;const e=game.advance(s,1/120).find(e=>e.type==='shot');assert.equal(s.hp,before);assert.equal(e.enemyShieldDamage,5);const shield=s.combat.enemyShield;
 game.unequipWeapon(s,0);game.equipWeapon(s,'w1',0);assert.equal(s.combat.enemyShield,shield);
});
test('regeneration heals at two seconds without overheal; fury has stronger repeat attack',()=>{
 let regen,fury;for(let l=4;l<8;l++){if(enemyFor(l,2).elite==='regen')regen=l;if(enemyFor(l,2).elite==='fury')fury=l;}assert.ok(regen&&fury);
 const s=setup(['pistol'],regen,2);s.equipment=[null,null,null];s.hp=1;run(s,2);assert.ok(s.hp>1);assert.ok(s.hp<=game.targetHealth(s));
 const f=setup(['pistol'],fury,2);f.survival.enemyStrikes=1;const a=enemyAttack(f);assert.equal(a.cycle,3.5*.8);assert.equal(a.damage,Math.ceil((6+Math.floor((fury-3)*.9))*1.3));
});
test('challenge links are isolated and blessing damage is excluded',()=>{
 const s=setup(['crossbow','sniper']);game.advance(s,1/120);assert.ok(s.combat);const before=JSON.stringify(s.combat);s.expedition.choices=['attack','speed','hunter'];
 game.startChallenge(s,0);const shots=game.advance(s,1/120).filter(e=>e.type==='shot');assert.equal(shots[0].damage,9);assert.equal(shots[1].damage,Math.floor(18*1.3));assert.equal(JSON.stringify(s.combat),before);game.exitChallenge(s);assert.equal(JSON.stringify(s.combat),before);
});
test('mark expires at four seconds and charge caps at three with encounter-specific resets',()=>{
 const s=setup(['crossbow','sniper'],20);game.advance(s,1/120);s.cooldowns=[100,100,100];run(s,4);assert.ok(s.combat.markTime<1e-8);s.cooldowns[1]=0;assert.equal(game.advance(s,1/120).find(e=>e.type==='shot').damage,18);
 const c=setup(['ward','rocket'],10);c.cooldowns=[0,100,100];run(c,2);assert.equal(c.combat.charge,3);c.hp=1;c.cooldowns=[0,100,100];game.advance(c,1/120);assert.equal(c.combat.charge,3);assert.equal(c.combat.markTime,0);
 c.cooldowns=[100,0,100];assert.equal(game.advance(c,1/120).find(e=>e.type==='shot').damage,Math.floor(24*1.3));assert.equal(c.combat.charge,0);
 c.kills=9;c.hp=1;c.cooldowns=[0,100,100];game.advance(c,1/120);assert.equal(c.combat.charge,0);c.combat.charge=3;c.status='failed';game.retry(c);assert.equal(c.combat.charge,0);
});
