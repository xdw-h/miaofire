import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio.mjs';

function fakeContext(state='suspended'){
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 return {state,currentTime:0,destination:{},oscillators:[],gains:[],resumeCalls:0,
  async resume(){this.resumeCalls++;this.state='running';},
  createGain(){const g={gain:param(),connect(){},disconnect(){this.disconnected=true;}};this.gains.push(g);return g;},
  createOscillator(){const o={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.stopped=t;}};this.oscillators.push(o);return o;},
 };
}
test('audio is lazy, waits for mobile resume, then generates confirmation and music',async()=>{
 const ctx=fakeContext();let created=0,finish;ctx.resume=()=>new Promise(resolve=>finish=()=>{ctx.state='running';resolve();});
 const a=new GameAudio(()=>{created++;return ctx;});assert.equal(created,0);assert.equal(a.enabled,false);
 const pending=a.enable();assert.equal(a.status,'starting');assert.equal(a.enabled,false);assert.equal(ctx.oscillators.length,0);
 finish();assert.equal(await pending,true);assert.equal(a.status,'playing');a.tick();assert.ok(ctx.oscillators.length>=3);
});
test('resume rejection or non-running state never falsely reports enabled',async()=>{
 for(const resume of [async()=>{throw Error('denied');},async()=>{}]){
  const ctx=fakeContext();ctx.resume=resume;const a=new GameAudio(()=>ctx);
  assert.equal(await a.enable(),false);assert.equal(a.enabled,false);assert.equal(a.status,'blocked');assert.equal(ctx.oscillators.length,0);
 }
});
test('disable cancels an in-flight resume and prevents late audio',async()=>{
 const ctx=fakeContext();let finish;ctx.resume=()=>new Promise(resolve=>finish=()=>{ctx.state='running';resolve();});const a=new GameAudio(()=>ctx);
 const pending=a.enable();a.disable();finish();await pending;a.tick();assert.equal(a.status,'off');assert.equal(a.enabled,false);assert.equal(ctx.oscillators.length,0);
});
test('pause stops voices and skips missed music instead of burst playback',async()=>{
 const ctx=fakeContext(),a=new GameAudio(()=>ctx);await a.enable();a.tick();const old=[...ctx.oscillators];
 a.setPaused(true);assert.ok(old.every(o=>o.disconnected));const n=ctx.oscillators.length;ctx.currentTime=100;a.tick();a.play('shot');assert.equal(ctx.oscillators.length,n);
 a.setPaused(false);a.tick();assert.ok(ctx.oscillators.length-n<=2);assert.ok(ctx.oscillators.slice(n).every(o=>o.started>=100));
});
test('volume clamps and disable removes scheduled notes immediately',async()=>{
 const ctx=fakeContext(),a=new GameAudio(()=>ctx);await a.enable();a.tick();a.setVolume(2);assert.equal(a.volume,1);a.setVolume(-1);assert.equal(a.volume,0);
 a.setVolume(.6);a.disable();assert.equal(a.master.gain.value,0);assert.ok(ctx.oscillators.every(o=>o.disconnected));const n=ctx.oscillators.length;a.play('test');assert.equal(ctx.oscillators.length,n);
});
test('interrupted mobile audio exposes recovery and resumes from a fresh gesture',async()=>{
 const ctx=fakeContext(),a=new GameAudio(()=>ctx);await a.enable();ctx.state='interrupted';ctx.onstatechange();assert.equal(a.status,'blocked');assert.equal(a.enabled,false);
 assert.equal(await a.enable(),true);assert.equal(ctx.resumeCalls,2);assert.equal(a.status,'playing');
});
test('finished oscillators release connections and repeated ticks do not duplicate notes',async()=>{
 const ctx=fakeContext(),a=new GameAudio(()=>ctx);await a.enable();a.tick();const n=ctx.oscillators.length;a.tick();assert.equal(ctx.oscillators.length,n);
 const o=ctx.oscillators[0];o.onended();assert.equal(o.disconnected,true);assert.equal(a.voices.has(o),false);
});
test('unavailable audio and a stalled mobile resume remain recoverable without false success',async()=>{
 const unavailable=new GameAudio(()=>{throw Error('unsupported');});assert.equal(await unavailable.enable(),false);assert.equal(unavailable.status,'blocked');
 const ctx=fakeContext();ctx.resume=()=>new Promise(()=>{});const a=new GameAudio(()=>ctx);
 assert.equal(await a.enable(),false);assert.equal(a.status,'blocked');assert.equal(a.enabled,false);assert.equal(ctx.oscillators.length,0);
 ctx.resume=async()=>{ctx.state='running';};assert.equal(await a.enable(),true);
});
