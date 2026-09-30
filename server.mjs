import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const flag = process.argv.indexOf('--port');
const port = flag >= 0 ? Number(process.argv[flag + 1]) : 4173;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Port must be 1024–65535');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server = http.createServer(async (req, res) => {
  const accountFlag=process.argv.indexOf('--account-port');
  if(accountFlag>=0&&new URL(req.url,'http://localhost').pathname.startsWith('/api/account/')){
    const upstream=http.request({hostname:'127.0.0.1',port:Number(process.argv[accountFlag+1]),path:req.url.slice('/api/account'.length),method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502,{'Content-Type':'application/json'});res.end('{"error":"本地账号服务未启动"}');});req.pipe(upstream);return;
  }
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405, {'Allow':'GET, HEAD'});res.end();return;}
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${requested === '/' ? '/index.html' : requested}`);
    if (!file.startsWith(root + path.sep) || requested.includes('\0')) {res.writeHead(403);res.end('Forbidden');return;}
    if (!(await stat(file)).isFile()) {res.writeHead(404);res.end('Not found');return;}
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 404, {'Content-Type':'text/plain; charset=utf-8'});
    res.end(error instanceof URIError ? 'Invalid URL' : 'Not found');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被使用。若游戏已启动，请打开 http://localhost:${port}；或使用 --port 4174。` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`喵火前线已启动：http://localhost:${port}\n关闭此服务后，页面将不能重新加载。`));
