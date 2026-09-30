import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker from '../backend/honor/worker.mjs';

const origin='https://xdw-h.github.io';
const token=n=>n.toString(16).padStart(64,'0');
function env(t){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../backend/honor/schema.sql',import.meta.url),'utf8'));t.after(()=>db.close());
 const DB={prepare(sql){return{bind(...values){const stmt=db.prepare(sql);return{first:async()=>stmt.get(...values)??null,all:async()=>({results:stmt.all(...values)}),run:async()=>stmt.run(...values)};}};}};
 return{DB,RATE_LIMIT_SALT:'test-only-not-a-production-secret-0001',ALLOWED_ORIGINS:origin};
}
function call(e,{path='/endless-leaderboard',method='GET',data,who=1,headers={},body}={}){
 return worker.fetch(new Request(`https://honor.example${path}`,{method,headers:{origin,...(who?{authorization:`Bearer ${token(who)}`} : {}),...(data!==undefined||body!==undefined?{'content-type':'application/json'}:{}),...headers},...(data!==undefined?{body:JSON.stringify(data)}:body!==undefined?{body}:{})}),e);
}
const post=(e,waves,who=1,nickname=`猫${who}`,extra={})=>call(e,{path:'/endless-scores',method:'POST',data:{nickname,waves},who,...extra});
const list=async(e,who=1)=>{const response=await call(e,{who});assert.equal(response.status,200);return response.json();};

test('endless leaderboard shares ranked public results across two token identities',async t=>{
 const e=env(t);assert.equal((await post(e,5)).status,200);assert.equal((await post(e,9,2)).status,200);
 const result=await list(e);assert.deepEqual(result.entries.map(row=>[row.nickname,row.waves,row.rank]),[['猫2',9,1],['猫1',5,2]]);assert.equal(result.mine.rank,2);
 assert.deepEqual(Object.keys(result.mine).sort(),['achievedAt','id','nickname','rank','waves']);
 assert.ok(!JSON.stringify(result).includes(token(1)));assert.notEqual(result.entries[0].id,result.entries[1].id);
 const publicResult=await list(e,null);assert.equal(publicResult.mine,null);assert.deepEqual(publicResult.entries,result.entries);
});

test('lower/equal submissions only rename; improvement updates best and achieved time',async t=>{
 const e=env(t);t.mock.method(Date,'now',()=>1000);
 assert.equal((await post(e,12)).status,200);const first=(await list(e)).mine;
 Date.now.mock.mockImplementation(()=>2000);await post(e,12,2);
 Date.now.mock.mockImplementation(()=>3000);await post(e,4,1,'新猫名');
 let mine=(await list(e)).mine;assert.equal(mine.waves,12);assert.equal(mine.nickname,'新猫名');assert.equal(mine.achievedAt,1000);assert.equal(mine.id,first.id);assert.equal(mine.rank,1);
 await post(e,12,1,'同分新名');mine=(await list(e)).mine;assert.equal(mine.achievedAt,1000);assert.equal(mine.rank,1);
 await post(e,13);mine=(await list(e)).mine;assert.equal(mine.waves,13);assert.equal(mine.achievedAt,3000);assert.equal(mine.id,first.id);
});

test('wave ties sort by first achieved time then public id and personal rank uses the same order',async t=>{
 const e=env(t);t.mock.method(Date,'now',()=>1000);
 assert.equal((await post(e,8,1)).status,200);await post(e,8,2);
 await e.DB.prepare('UPDATE endless_scores SET public_id=?1 WHERE nickname=?2').bind('z-id','猫1').run();
 await e.DB.prepare('UPDATE endless_scores SET public_id=?1 WHERE nickname=?2').bind('a-id','猫2').run();
 Date.now.mock.mockImplementation(()=>2000);await post(e,8,3);
 const result=await list(e);assert.deepEqual(result.entries.map(row=>row.nickname),['猫2','猫1','猫3']);assert.equal(result.mine.rank,2);assert.equal((await list(e,3)).mine.rank,3);
});

test('top 100 cutoff still returns personal score and rank below the cutoff',async t=>{
 const e=env(t);for(let i=1;i<=101;i++)assert.equal((await post(e,i,i,`猫${i}`,{headers:{'CF-Connecting-IP':`test-${i}`}})).status,200);
 const result=await list(e);assert.equal(result.entries.length,100);assert.equal(result.entries[0].waves,101);assert.equal(result.entries[99].waves,2);assert.equal(result.mine.waves,1);assert.equal(result.mine.rank,101);
});

test('endless validation rejects invalid bounds and nicknames while accepting both boundaries',async t=>{
 const e=env(t);
 for(const waves of [0,-1,100000,1.5,'2',null])assert.equal((await post(e,waves)).status,400);
 for(const nickname of ['', '<img>', '猫'.repeat(17)])assert.equal((await post(e,1,1,nickname)).status,400);
 assert.equal((await call(e,{path:'/endless-scores',method:'POST',data:{nickname:'猫'}})).status,400);
 assert.equal((await post(e,1)).status,200);assert.equal((await post(e,99999)).status,200);assert.equal((await list(e)).mine.waves,99999);
});

test('endless endpoints require valid write authentication and approved Origin with CORS support',async t=>{
 const e=env(t);
 assert.equal((await post(e,1,null)).status,401);
 for(const authorization of ['Bearer short',`Bearer ${'A'.repeat(64)}`,`Basic ${token(1)}`])assert.equal((await post(e,1,1,'猫',{headers:{authorization}})).status,401);
 for(const disallowed of ['', 'https://unapproved.test'])assert.equal((await post(e,1,1,'猫',{headers:{origin:disallowed}})).status,403);
 assert.equal((await call(e,{headers:{origin:'https://unapproved.test'}})).status,403);
 for(const path of ['/endless-leaderboard','/endless-scores']){const pre=await call(e,{path,method:'OPTIONS'});assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);}
 assert.equal((await call(e,{method:'DELETE'})).status,405);assert.equal((await list(e)).entries.length,0);
});

test('endless endpoints reject payload abuse and avoid exposing database failures',async t=>{
 const e=env(t);
 for(const [body,status,headers] of [['x'.repeat(2100),413,{}],['{',400,{}],['{}',415,{'content-type':'text/plain'}],['{}',413,{'content-length':'99999'}]])assert.equal((await call(e,{path:'/endless-scores',method:'POST',body,headers})).status,status);
 const broken={...e,DB:{prepare(){throw Error('secret-database-information');}}};const failure=await call(broken);assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('secret-database-information'));
});

test('main and endless submissions share the 30 per hour IP budget and recover next hour',async t=>{
 const e=env(t);t.mock.method(Date,'now',()=>3600000);
 for(let i=0;i<15;i++){assert.equal((await post(e,1)).status,200);assert.equal((await call(e,{path:'/scores',method:'POST',data:{nickname:'主线猫',stage:1,waves:0}})).status,200);}
 const limited=await post(e,2);assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'3600');assert.equal((await call(e,{path:'/scores',method:'POST',data:{nickname:'主线猫',stage:2,waves:0}})).status,429);
 assert.equal((await post(e,2,2,'另一猫',{headers:{'CF-Connecting-IP':'different'}})).status,200);
 Date.now.mock.mockImplementation(()=>7200000);assert.equal((await post(e,3)).status,200);
});

test('main and endless records remain independent for the same identity',async t=>{
 const e=env(t);assert.equal((await call(e,{path:'/scores',method:'POST',data:{nickname:'主线猫',stage:9,waves:3}})).status,200);
 const before=await(await call(e,{path:'/leaderboard'})).json();assert.deepEqual((await list(e)).entries,[]);
 assert.equal((await post(e,42,1,'无尽猫')).status,200);assert.deepEqual(await(await call(e,{path:'/leaderboard'})).json(),before);
 await call(e,{path:'/scores',method:'POST',data:{nickname:'主线改名',stage:10,waves:0}});
 const endless=(await list(e)).mine;assert.equal(endless.waves,42);assert.equal(endless.nickname,'无尽猫');assert.equal(endless.rank,1);
});
