import test from 'node:test';import assert from 'node:assert/strict';import {createGame} from '../src/game.mjs';import {scoreFromGame,cleanNickname} from '../src/leaderboard-rules.mjs';
let client,dates;try{client=await import('../src/leaderboard-client.mjs');dates=await import('../src/date-format.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('unsubmitted best waves survive retry, reload and rebirth independently of game save',()=>{
 const storage=store(),a=client.createLeaderboardClient({storage});
 assert.deepEqual(a.remember({stage:5,waves:8}),{stage:5,waves:8});
 assert.deepEqual(a.remember({stage:5,waves:0}),{stage:5,waves:8});
 const b=client.createLeaderboardClient({storage});assert.deepEqual(b.remember({stage:1,waves:9}),{stage:5,waves:8});
 assert.deepEqual(b.remember({stage:6,waves:0}),{stage:6,waves:0});
});
test('score captures historical highest clear and only matching current wave progress',()=>{
 const s=createGame();assert.equal(scoreFromGame(s),null);s.kills=3;assert.deepEqual(scoreFromGame(s),{stage:0,waves:3});s.bestEver=12;s.level=2;s.kills=9;assert.deepEqual(scoreFromGame(s),{stage:12,waves:0});
 assert.equal(cleanNickname('<script>'),null);assert.equal(cleanNickname('猫\n咪'),null);assert.equal(cleanNickname('  猫  咪  '),'猫 咪');
});
test('anonymous identity persists, two storage areas differ, no requests when backend absent',async()=>{
 assert.ok(client,'荣誉榜客户端尚未实现');const a=store(),b=store();let calls=0;const network=async()=>{calls++;return Response.json({entries:[],mine:null});};
 const first=client.createLeaderboardClient({storage:a,api:'https://honor.test',fetcher:network});await first.load();const second=client.createLeaderboardClient({storage:a,api:'https://honor.test',fetcher:network});assert.equal(first.identity,second.identity);assert.notEqual(first.identity,client.createLeaderboardClient({storage:b,api:'https://honor.test',fetcher:network}).identity);
 await assert.rejects(client.createLeaderboardClient({storage:a,api:'',fetcher:network}).load(),/尚未开放/);assert.equal(calls,1);
});
test('network errors retain identity and storage failure prevents orphan submissions',async()=>{
 assert.ok(client,'荣誉榜客户端尚未实现');const a=store(),c=client.createLeaderboardClient({storage:a,api:'https://honor.test',fetcher:async()=>{throw Error('offline');}});const id=c.identity;await assert.rejects(c.submit('猫咪',{stage:3,waves:0}),/连接/);assert.equal(c.identity,id);
 let called=false;const bad=client.createLeaderboardClient({storage:{getItem(){throw Error();},setItem(){throw Error();}},api:'https://honor.test',fetcher:async()=>{called=true;}});await assert.rejects(bad.submit('猫咪',{stage:1,waves:0}),/保存/);assert.equal(called,false);
});
test('dates show local time without raw ISO suffixes and handle database dates and empty values',()=>{
 assert.ok(dates,'共享日期工具尚未实现');for(const input of ['2026-09-30T01:02:03.123Z','2026-09-30T09:02:03+08:00','2026-09-30 09:02:03'])assert.match(dates.formatDateTime(input),/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
 assert.equal(dates.formatDateTime('2026-09-30'),'2026-09-30');assert.equal(dates.formatDateTime(null),'-');assert.equal(dates.formatDateTime('bad'),'-');assert.equal(dates.formatDateTime('2026-02-30'),'-');assert.equal(dates.formatDateTime('2026-09-30T01:02:03Z'),dates.formatDateTime('2026-09-30T09:02:03+08:00'));
});
