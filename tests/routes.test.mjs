import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame,startExpedition,chooseRoute,advance,routeAction,exitExpedition} from '../src/game.mjs';
import {ROUTE_NODES,routeDefaults} from '../src/routes.mjs';

test('远征在第 12 关解锁并拥有三层分岔节点',()=>{
  const locked=createGame();locked.bestEver=11;assert.equal(startExpedition(locked).ok,false);
  const s=createGame();s.bestEver=12;assert.equal(startExpedition(s).ok,true);
  assert.equal(s.challenge.kind,'expedition');assert.equal(s.challenge.route.layer,0);assert.equal(ROUTE_NODES.length,3);
  assert.equal(chooseRoute(s,'battle').ok,true);assert.equal(s.challenge.route.nodeType,'battle');
});

test('不同节点提供实际不同的奖励与战斗目标，不能跳层或重复选路',()=>{
 const s=createGame();s.bestEver=12;startExpedition(s);assert.equal(chooseRoute(s,'elite').ok,false);assert.equal(chooseRoute(s,'battle').ok,true);
 assert.equal(s.challenge.route.nodeType,'battle');assert.ok(s.challenge.route.targetKills===3);assert.equal(chooseRoute(s,'chest').ok,false);
});

test('商店、宝箱、休息只消耗远征资源并且不可重复领取',()=>{
 const s=createGame();s.bestEver=12;startExpedition(s);s.challenge.route.layer=1;s.challenge.status='route';chooseRoute(s,'shop');s.challenge.route.coins=20;
 assert.equal(routeAction(s,'buy-shield').ok,true);assert.equal(routeAction(s,'buy-shield').ok,false);
 s.challenge.status='route';s.challenge.route.layer=0;chooseRoute(s,'chest');assert.equal(routeAction(s,'open').ok,true);assert.equal(routeAction(s,'open').ok,false);
 s.challenge.status='route';s.challenge.route.layer=1;chooseRoute(s,'rest');s.challenge.route.hp=1;assert.equal(routeAction(s,'rest').ok,true);assert.ok(s.challenge.route.hp>1);
});

test('远征战斗独立推进，退出清理挑战但保留主线资源',()=>{
 const s=createGame();s.bestEver=12;s.coins=77;startExpedition(s);chooseRoute(s,'battle');
 const before=s.coins;advance(s,.2);assert.equal(s.challenge.kind,'expedition');assert.equal(s.coins,before);
 assert.equal(exitExpedition(s).ok,true);assert.equal(s.challenge,null);assert.equal(s.coins,77);
});

test('远征默认值可安全补齐旧存档',()=>{assert.deepEqual(routeDefaults(),{best:0,clears:0});});
