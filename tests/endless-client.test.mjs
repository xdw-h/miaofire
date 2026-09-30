import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeaderboardClient,HONOR_KEY} from '../src/leaderboard-client.mjs';
const store=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('endless and main clients share identity without overwriting either best',()=>{
 const storage=store(),main=createLeaderboardClient({storage}),endless=createLeaderboardClient({storage,board:'endless'});
 assert.equal(main.identity,endless.identity);
 assert.deepEqual(endless.remember({waves:15}),{waves:15});
 main.remember({stage:8,waves:3});endless.remember({waves:20});main.remember({stage:9,waves:0});
 assert.deepEqual(createLeaderboardClient({storage,board:'endless'}).remember({waves:1}),{waves:20});
 assert.deepEqual(createLeaderboardClient({storage}).remember({stage:1,waves:0}),{stage:9,waves:0});
 assert.equal(JSON.parse(storage.getItem(HONOR_KEY)).token,main.identity);
});
test('endless client uses separate endpoints, validates wave scores and server rows',async()=>{
 const calls=[],storage=store(),entry={id:'player',nickname:'猫',waves:12,rank:1,achievedAt:Date.now()};
 const client=createLeaderboardClient({storage,board:'endless',api:'https://honor.test',fetcher:async(url,options)=>{calls.push({url,options});return Response.json({entries:[entry],mine:entry});}});
 assert.deepEqual((await client.load()).mine,entry);await client.submit('猫',{waves:12});
 assert.equal(calls[0].url,'https://honor.test/endless-leaderboard');assert.equal(calls[1].url,'https://honor.test/endless-scores');
 assert.deepEqual(JSON.parse(calls[1].options.body),{nickname:'猫',waves:12});
 for(const waves of [0,-1,1.5,100000,Infinity])await assert.rejects(client.submit('猫',{waves}));
 const broken=createLeaderboardClient({storage,board:'endless',api:'https://honor.test',fetcher:async()=>Response.json({entries:[{...entry,waves:-1}],mine:null})});
 await assert.rejects(broken.load(),/数据异常/);
});
test('a corrupt profile recovers in writable storage and both boards keep the last submitted nickname',async()=>{
 const storage=store();storage.setItem(HONOR_KEY,'broken json');
 const fetcher=async(url,options)=>{const data=JSON.parse(options.body);return Response.json({mine:{id:'cat',...data,rank:1,achievedAt:Date.now()}});};
 const main=createLeaderboardClient({storage,api:'https://honor.test',fetcher}),endless=createLeaderboardClient({storage,api:'https://honor.test',board:'endless',fetcher});
 assert.equal(main.identity,endless.identity);
 await main.submit('猫队长',{stage:5,waves:1});endless.remember({waves:3});
 assert.equal(endless.nickname,'猫队长');assert.equal(JSON.parse(storage.getItem(HONOR_KEY)).nickname,'猫队长');
 await endless.submit('新队长',{waves:3});main.remember({stage:6,waves:0});
 assert.equal(main.nickname,'新队长');assert.equal(createLeaderboardClient({storage}).nickname,'新队长');
});
