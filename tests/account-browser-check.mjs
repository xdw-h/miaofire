// Optional manual browser acceptance check; use only against a disposable local DB.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.ACCOUNT_TEST_URL||'http://localhost:4190';
const username='qa_'+randomBytes(6).toString('hex'),password=randomBytes(18).toString('hex');
const errors=[];
try{
 const one=await browser.newContext({viewport:{width:390,height:844}}),page=await one.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('button',{name:'账号 / 云存档',exact:true}).click();
 await page.getByRole('button',{name:'注册并绑定游客'}).click();await page.getByLabel('用户名',{exact:true}).fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByLabel('确认密码',{exact:true}).fill(password);await page.getByRole('button',{name:'创建账号',exact:true}).click();
 await page.getByRole('button',{name:'我已保存恢复码'}).click();await page.getByRole('button',{name:'绑定当前进度到账号'}).click();
 await page.getByRole('button',{name:'确认使用本机进度'}).click();await page.getByRole('button',{name:`账号 · ${username}`,exact:true}).waitFor();
 await page.getByRole('button',{name:`账号 · ${username}`,exact:true}).click();await page.getByRole('button',{name:'立即保存到云端'}).click();await page.locator('[data-status]').filter({hasText:'云端已保存'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile fits viewport');
 const two=await browser.newContext(),p2=await two.newPage();p2.on('pageerror',e=>errors.push(e.message));await p2.goto(base);await p2.getByRole('button',{name:'账号 / 云存档',exact:true}).click();await p2.getByLabel('用户名',{exact:true}).fill(username);await p2.getByLabel('密码',{exact:true}).fill(password);await p2.getByRole('button',{name:'登录账号',exact:true}).click();await p2.getByRole('button',{name:'使用云端进度',exact:true}).click();await p2.getByRole('button',{name:'确认使用云端进度'}).click();await p2.getByRole('button',{name:`账号 · ${username}`,exact:true}).waitFor();
 await p2.getByRole('button',{name:`账号 · ${username}`,exact:true}).click();await p2.getByRole('button',{name:'立即保存到云端'}).click();await p2.locator('[data-status]').filter({hasText:'云端已保存'}).waitFor();
 await page.getByRole('button',{name:'立即保存到云端'}).click();await page.locator('[data-status]').filter({hasText:'其他设备更新'}).waitFor();
 await one.setOffline(true);await page.getByRole('button',{name:'重新读取云存档'}).click();await page.locator('[data-status]').filter({hasText:'进度仍保存在本机'}).waitFor();await one.setOffline(false);
 await p2.getByRole('button',{name:'退出账号，返回游客'}).click();await p2.getByRole('button',{name:'账号 / 云存档',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: register, binding, upload, second-browser restore, revision conflict, offline recovery, logout, mobile layout, no JS errors');console.log('Temporary test username:',username);
}finally{await browser.close();}
