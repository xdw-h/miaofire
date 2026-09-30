import {accountRequest,activateAccount,activateGuest,parseSave,storedRevision,saveRevision} from './account-client.mjs';
import {SAVE_KEY} from './storage.mjs';
import {formatDateTime} from './date-format.mjs';
import {escapeHTML as esc} from './leaderboard-rules.mjs';

export function createAccountPanel({raw,storage,persist,notify}){
 const dialog=document.createElement('dialog');dialog.className='dialog-backdrop account-dialog';dialog.setAttribute('aria-label','账号与云存档');document.body.append(dialog);
 let user=null,cloud=null,revision=null,ready=false,busy=false,mode='login',lastUpload=null,recoveryCode='',notice='正在检查账号…';
 const button=document.querySelector('#account-button');
 function status(message){notice=message;button.textContent=ready?`账号 · ${user.username}`:storage.owner?'账号 · 待同步':'账号 / 云存档';const el=dialog.querySelector('[data-status]');if(el)el.textContent=message;const label=document.querySelector('#cloud-status');if(label)label.textContent=message;}
 function summary(rawSave){try{const s=parseSave(rawSave).state;return `最高 ${s.bestEver} 关 · 金币 ${Math.floor(s.coins)} · 钻石 ${s.gems} · 武器 ${s.inventory.length} 把`;}catch{return '没有可用进度';}}
 function render(){
  const local=storage.getItem(SAVE_KEY);
  dialog.innerHTML=`<div class="dialog-header"><h2>账号与云存档</h2><button class="icon-button" data-account="close" aria-label="关闭账号面板">×</button></div><div class="dialog-content"><p data-status role="status">${esc(notice)}</p>${recoveryCode?`<section class="account-recovery"><b>请保存恢复码，忘记密码时使用</b><p>只在本次显示。不要分享给他人。</p><textarea readonly aria-label="恢复码">${recoveryCode}</textarea><button class="secondary-button" data-account="saved-code">我已保存恢复码</button></section>`:''}${user?`<p>已登录：<strong>${esc(user.username)}</strong></p><div class="settings-row"><div><b>本机进度${storage.owner&&storage.owner!==user.id?'（其他账号，不可绑定）':storage.owner?'（当前账号）':'（游客）'}</b><p>${esc(summary(local))}</p></div></div><div class="settings-row"><div><b>云端进度</b><p>${cloud?.save?esc(summary(JSON.stringify(cloud.save))):'尚未创建云存档'}</p><p>云端时间：${esc(formatDateTime(cloud?.updatedAt))}</p></div></div><p>选择会替换当前账号在此浏览器的进度，原本地进度会备份；游客原档始终保留。</p><div class="account-actions"><button class="primary-button" data-account="cloud" ${!cloud?.save?'disabled':''}>使用云端进度</button><button class="secondary-button" data-account="local" ${cloud===null||!!storage.owner&&storage.owner!==user.id?'disabled':''}>${cloud?.save?'用本机进度覆盖云端':'绑定当前进度到账号'}</button><button class="secondary-button" data-account="sync" ${!ready?'disabled':''}>立即保存到云端</button><button class="text-button" data-account="refresh">重新读取云存档</button><button class="text-button" data-account="logout">退出账号，返回游客</button></div>`:`<div class="account-actions"><button class="text-button" data-account="login">登录</button><button class="text-button" data-account="register">注册并绑定游客</button><button class="text-button" data-account="recover">找回密码</button></div><form id="account-form"><label>用户名<input name="username" aria-label="用户名" autocomplete="username" pattern="[A-Za-z0-9_]{3,24}" minlength="3" maxlength="24" required></label><small>3–24 位英文字母、数字或下划线，不区分大小写</small><label>${mode==='recover'?'新密码':'密码'}<input name="password" aria-label="密码" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="10" maxlength="128" required></label><small>至少 10 个字符，请勿使用服务器密码</small>${mode!=='login'?'<label>确认密码<input name="confirm" aria-label="确认密码" type="password" autocomplete="new-password" minlength="10" maxlength="128" required></label>':''}${mode==='recover'?'<label>恢复码<input name="recoveryCode" aria-label="恢复码" autocomplete="off" required></label>':''}<button class="primary-button wide" type="submit">${mode==='register'?'创建账号':mode==='recover'?'重设密码':'登录账号'}</button></form><p>不登录也能玩。游客进度只保存在此浏览器；注册后可选择绑定进度。</p>${storage.owner?'<button class="text-button" data-account="guest">返回游客进度（保留账号本地备份）</button>':''}`}</div>`;
 }
 async function readCloud(){ready=false;cloud=null;const result=await accountRequest('/save',{userId:user.id});cloud=result;revision=storedRevision(raw,user.id);if(storage.owner===user.id&&revision===cloud.revision&&cloud.save){ready=true;status('云存档已连接 · 每 30 秒自动同步');}else status('请选择使用云端或本机进度，选择前不会自动覆盖。');}
 async function sync(){if(!ready||busy)return;busy=true;try{persist();const payload=storage.getItem(SAVE_KEY);const save=parseSave(payload);const result=await accountRequest('/save',{userId:user.id,body:{save,revision}});revision=result.revision;saveRevision(raw,user.id,revision);lastUpload=result.updatedAt;cloud={save,...result};status('云端已保存 · '+formatDateTime(lastUpload));}catch(e){if([401,409,403].includes(e.status)){ready=false;}status(e.message);}finally{busy=false;}}
 async function action(id){if(busy)return;const confirmed=id.startsWith('confirm-');if(confirmed)id=id.slice(8);if(id==='cancel-choice'){render();return;}if(id==='close'){dialog.close();return;}if(id==='saved-code'){recoveryCode='';render();return;}if(['login','register','recover'].includes(id)){mode=id;render();return;}busy=true;try{
  if(id==='refresh'){await readCloud();render();}
  if(id==='sync'){busy=false;await sync();render();return;}
  if(id==='logout'||id==='guest'){if(id==='logout')await accountRequest('/logout',{body:{}});activateGuest(raw);location.reload();}
  if(id==='cloud'||id==='local'){
   if(recoveryCode)throw Error('请先保存恢复码，并点击“我已保存恢复码”。');
   if(id==='local'&&storage.owner&&storage.owner!==user.id)throw Error('不能把其他账号进度绑定到当前账号。');
   if(!cloud)throw Error('请先重新读取云存档。');
   if(!confirmed){dialog.querySelector('[data-confirmation]')?.remove();const panel=document.createElement('section');panel.dataset.confirmation='';panel.className='account-recovery';panel.innerHTML=`<p>${id==='cloud'?'使用云端进度？当前账号的本机进度将备份后替换。':'将本机进度保存到当前账号？已有云端进度会被替换。'}</p><button class="primary-button" data-account="confirm-${id}">确认使用${id==='cloud'?'云端':'本机'}进度</button> <button class="text-button" data-account="cancel-choice">取消</button>`;dialog.querySelector('.dialog-content').append(panel);panel.scrollIntoView({block:'nearest'});return;}
   persist();let payload,rev=cloud.revision;
   if(id==='local'){payload=storage.getItem(SAVE_KEY);const save=parseSave(payload);const result=await accountRequest('/save',{userId:user.id,body:{save,revision:rev}});rev=result.revision;}
   else {const latest=await accountRequest('/save',{userId:user.id});if(!latest.save)throw Error('云端尚无存档。');payload=JSON.stringify(latest.save);rev=latest.revision;}
   activateAccount(raw,user,payload,rev);location.reload();
  }
 }catch(e){if([401,403,409].includes(e.status))ready=false;status(e.message);}finally{busy=false;}}
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-account]');if(b)void action(b.dataset.account);});
 dialog.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;const form=e.target,data=Object.fromEntries(new FormData(form));try{if(mode!=='login'&&data.password!==data.confirm)throw Error('两次输入的密码不一致。');const result=await accountRequest('/'+mode,{body:data});form.reset();recoveryCode=result.recoveryCode||'';if(mode==='recover'){mode='login';status('密码已重设，请保存新的恢复码后登录。');}else{user=result.user;ready=false;try{await readCloud();}catch(error){status(error.message);}}render();}catch(error){status(error.message);}finally{busy=false;}});
 async function init(){try{const me=await accountRequest('/me');user=me.user;if(user)await readCloud();else status(storage.owner?'账号未登录，本机进度保留，请登录后同步。':'游客试玩 · 登录后可跨设备同步');}catch(e){status(e.message);}if(dialog.open)render();}
 setInterval(()=>void sync(),30000);
 window.addEventListener('online',()=>{if(ready)void sync();});
 window.addEventListener('storage',e=>{if(e.key==='miaofire.account.active'){ready=false;status('账号已在其他标签页切换，请刷新页面。');}});
 void init();
 return {open(){persist();render();dialog.showModal();},isOpen:()=>dialog.open};
}
