import test from 'node:test';
import assert from 'node:assert/strict';
import {ImpactTimeline} from '../src/impact-timeline.mjs';
test('impact waits for projectile arrival and targets the original tree',()=>{
 const fx=new ImpactTimeline();fx.add({type:'shot',targetId:'tree-1',damage:5,gun:'pistol'});
 assert.deepEqual(fx.tick(.1),[]);const events=fx.tick(.05);assert.equal(events.length,1);assert.equal(events[0].targetId,'tree-1');
});
test('kill transitions target before next projectile arrives and stale impacts are discarded',()=>{
 const fx=new ImpactTimeline();fx.add({type:'shot',targetId:'tree-1'});fx.add({type:'kill',targetId:'tree-1',nextTargetId:'tree-2'});fx.add({type:'shot',targetId:'tree-2'});
 assert.equal(fx.tick(.15).length,3);assert.equal(fx.targetId,'tree-2');fx.add({type:'shot',targetId:'tree-1'});assert.deepEqual(fx.tick(.15),[]);
});
test('effect queue stays bounded and clearing cannot leak old impacts',()=>{
 const fx=new ImpactTimeline();for(let i=0;i<500;i++)fx.add({type:'shot',targetId:'tree-1'});assert.ok(fx.queue.length<=160);fx.clear();assert.deepEqual(fx.tick(1),[]);assert.equal(fx.targetId,null);
});
