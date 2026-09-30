// Local-only adapter: production uses Cloudflare D1.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import worker from './worker.mjs';
const db=new DatabaseSync(process.env.HONOR_DB||fileURLToPath(new URL('./dev.sqlite',import.meta.url)));
db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
const DB={prepare(sql){return{bind(...values){const stmt=db.prepare(sql);return{first:async()=>stmt.get(...values)??null,all:async()=>({results:stmt.all(...values)}),run:async()=>stmt.run(...values)};}};}};
const env={DB,RATE_LIMIT_SALT:'local-development-only-0000000000000000',ALLOWED_ORIGINS:'http://localhost:4182,http://127.0.0.1:4182'};
http.createServer(async(req,res)=>{
 try{
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const response=await worker.fetch(new Request(`http://localhost:4181${req.url}`,{method:req.method,headers:req.headers,...(size?{body:Buffer.concat(chunks)}:{})}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local API failure');}
}).listen(4181,'127.0.0.1',()=>console.log('本地荣誉榜 API：http://localhost:4181（仅本机测试）'));
