import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
const workerPath=new URL('../backend/honor/worker.mjs',import.meta.url),schemaPath=new URL('../backend/honor/schema.sql',import.meta.url);
let worker;try{worker=(await import(workerPath)).default;}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function env(t){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(schemaPath,'utf8'));t.after(()=>db.close());
 const DB={prepare(sql){return{bind(...values){const stmt=db.prepare(sql);return{first:async()=>stmt.get(...values)??null,all:async()=>({results:stmt.all(...values)}),run:async()=>stmt.run(...values)};}};}};
 return{DB,RATE_LIMIT_SALT:'test-only-not-a-production-secret-0001',ALLOWED_ORIGINS:'https://xdw-h.github.io'};
}
const token=n=>n.toString(16).padStart(64,'0');
test('top 100 remains bounded and personal rank is available below the cutoff',async t=>{
 const e=env(t);for(let i=1;i<=101;i++)await call(e,'POST',{nickname:`猫${i}`,stage:i,waves:0},i,{'CF-Connecting-IP':`test-${i}`});
 const result=await(await call(e)).json();assert.equal(result.entries.length,100);assert.equal(result.entries[0].stage,101);assert.equal(result.entries[99].stage,2);assert.equal(result.mine.rank,101);
});
test('oversized stream, invalid JSON and database outages fail safely',async t=>{
 const e=env(t),headers={origin:'https://xdw-h.github.io',authorization:`Bearer ${token(1)}`,'content-type':'application/json'};
 for(const [body,status] of [['x'.repeat(2100),413],['{',400]])assert.equal((await worker.fetch(new Request('https://honor.example/scores',{method:'POST',headers,body}),e)).status,status);
 const failed=await call({...e,DB:{prepare(){throw Error('secret-database-information');}}});assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('secret-database-information'));
});
async function call(e,method='GET',data,who=1,extra={}){const headers={origin:'https://xdw-h.github.io',...(who?{authorization:`Bearer ${token(who)}`}:{})};if(data)headers['content-type']='application/json';return worker.fetch(new Request(`https://honor.example/${method==='POST'?'scores':'leaderboard'}`,{method,headers:{...headers,...extra},...(data?{body:JSON.stringify(data)}:{})}),e);}
test('two players share ordered entries; only better records replace scores, nickname update keeps old best',async t=>{
 assert.ok(worker,'荣誉榜接口尚未实现');const e=env(t);
 assert.equal((await call(e,'POST',{nickname:'小猫甲',stage:5,waves:2},1)).status,200);
 await call(e,'POST',{nickname:'小猫乙',stage:7,waves:0},2);
 const top=await (await call(e)).json();assert.deepEqual(top.entries.map(x=>x.nickname),['小猫乙','小猫甲']);assert.equal(top.mine.rank,2);assert.equal(top.mine.stage,5);assert.ok(!JSON.stringify(top).includes(token(1)));
 await call(e,'POST',{nickname:'猫甲新名',stage:3,waves:1},1);const unchanged=await (await call(e)).json();assert.equal(unchanged.mine.stage,5);assert.equal(unchanged.mine.nickname,'猫甲新名');
 await call(e,'POST',{nickname:'猫甲新名',stage:8,waves:0},1);assert.equal((await (await call(e)).json()).mine.rank,1);
});
test('validation rejects forged bounds, HTML nicknames, missing token and unapproved origin',async t=>{
 assert.ok(worker,'荣誉榜接口尚未实现');const e=env(t);
 for(const score of [{nickname:'<img>',stage:1,waves:0},{nickname:'好猫',stage:1e99,waves:0},{nickname:'好猫',stage:1,waves:10},{nickname:'好猫',stage:1.5,waves:0},{nickname:'好猫',stage:0,waves:0}])assert.equal((await call(e,'POST',score)).status,400);
 assert.equal((await call(e,'POST',{nickname:'好猫',stage:1,waves:0},null)).status,401);
 assert.equal((await call(e,'POST',{nickname:'好猫',stage:1,waves:0},1,{origin:'https://unapproved.test'})).status,403);
 assert.equal((await (await call(e)).json()).entries.length,0);
});
test('repeated submissions remain one entry and cannot replace another identity',async t=>{
 assert.ok(worker,'荣誉榜接口尚未实现');const e=env(t);
 await Promise.all([call(e,'POST',{nickname:'甲猫',stage:6,waves:0},1),call(e,'POST',{nickname:'甲猫',stage:2,waves:0},1)]);
 await call(e,'POST',{nickname:'甲猫',stage:1,waves:2,playerId:'forged'},2);
 const result=await(await call(e)).json();assert.equal(result.entries.length,2);assert.equal(result.mine.stage,6);assert.notEqual(result.entries[0].id,result.entries[1].id);
});
test('submission limit and CORS preflight are enforced',async t=>{
 assert.ok(worker,'荣誉榜接口尚未实现');const e=env(t);for(let i=0;i<30;i++)assert.equal((await call(e,'POST',{nickname:'好猫',stage:1,waves:0})).status,200);
 assert.equal((await call(e,'POST',{nickname:'好猫',stage:1,waves:0})).status,429);
 const pre=await worker.fetch(new Request('https://honor.example/scores',{method:'OPTIONS',headers:{origin:'https://xdw-h.github.io'}}),e);assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'https://xdw-h.github.io');
});
