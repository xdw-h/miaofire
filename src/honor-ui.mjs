import {createLeaderboardClient} from './leaderboard-client.mjs';
import {cleanNickname,escapeHTML,scoreText} from './leaderboard-rules.mjs';
import {formatDateTime} from './date-format.mjs';
import {LEADERBOARD_API} from './leaderboard-config.mjs';
const e=escapeHTML;
export function createHonorBoard({storage,getScore,getEndlessScore=()=>null,onOpen=()=>{},onClose=()=>{}}){
 const clients={main:createLeaderboardClient({storage,api:LEADERBOARD_API}),endless:createLeaderboardClient({storage,api:LEADERBOARD_API,board:'endless'})};
 let client=clients.main,endless=false;
 const scoreLabel=score=>endless?score?`完成 ${score.waves} 波`:'尚未完成波次':scoreText(score);
 const localScore=()=>endless?getEndlessScore():getScore();
 const dialog=document.createElement('dialog');dialog.className='dialog-backdrop honor-dialog';dialog.setAttribute('aria-labelledby','honor-title');
 dialog.innerHTML=`<div class="dialog-header"><div><span class="honor-kicker">HALL OF PAWS</span><h2 id="honor-title">森林荣誉榜</h2></div><button class="icon-button" type="button" data-honor="close" aria-label="关闭荣誉榜">×</button></div><div class="dialog-content"><p class="honor-intro">把你的名字，留在森林的最高处。</p><div class="honor-rules">全球主线榜 · 通关数优先，同关比波次 · 前 100 名</div><form class="honor-form"><label for="honor-name">你的昵称</label><div class="honor-form-row"><input id="honor-name" name="nickname" maxlength="32" autocomplete="nickname" placeholder="给猫咪队长起个名字" required><button class="primary-button" type="submit">留名上榜</button></div><div id="honor-score" class="honor-score"></div><small>提交后公开昵称与战绩。同一浏览器保留最佳成绩；昵称可重名。</small></form><div class="honor-message" id="honor-message" role="status" aria-live="polite"></div><div class="honor-mine" id="honor-mine" hidden></div><div class="honor-heading"><b>森林里的闪耀名字</b><button class="text-button" type="button" data-honor="refresh">刷新榜单 ↻</button></div><div id="honor-entries" aria-busy="false"></div><p class="honor-footnote">同分按首次达到时间排序。清除网站数据或换浏览器会成为新玩家；榜单不同步游戏存档。</p></div>`;
 document.body.append(dialog);
 const tabs=document.createElement('div');tabs.className='honor-board-tabs';tabs.setAttribute('aria-label','选择榜单');
 tabs.innerHTML='<button class="secondary-button" data-honor="main" type="button">主线荣誉榜</button><button class="secondary-button" data-honor="endless" type="button">无尽生存榜</button>';
 dialog.querySelector('.dialog-content').prepend(tabs);
 const $=selector=>dialog.querySelector(selector);let generation=0,busy=false,currentScore=null;
 function message(text,error=false){$('#honor-message').textContent=text;$('#honor-message').classList.toggle('error',error);}
 function setBusy(value){busy=value;$('.honor-form button').disabled=value||!currentScore||!client.ready;$('[data-honor="refresh"]').disabled=value;$('#honor-entries').setAttribute('aria-busy',String(value));}
 function render(data){
  const own=data.mine;$('#honor-mine').hidden=!own;
  if(own)$('#honor-mine').innerHTML=`<span>我的荣誉</span><strong>第 ${own.rank} 名</strong><span>${e(own.nickname)} · ${e(scoreLabel(own))}</span>`;
  const rows=data.entries;
  if(!rows.length){$('#honor-entries').innerHTML='<div class="honor-empty"><span>✧</span><b>第一座奖台，等你登场</b><p>留下昵称，成为森林里的第一位传奇。</p></div>';return;}
  const podium=rows.slice(0,3).map((r,i)=>`<article class="honor-champion place-${i+1}${r.id===own?.id?' is-me':''}"><span class="honor-medal">${['🥇','🥈','🥉'][i]}</span><b>${e(r.nickname)}</b><strong>${endless?r.waves:r.stage}<small> ${endless?'波':'关'}</small></strong><span>${endless?'无尽守卫':r.waves?`再破 ${r.waves} 波`:'关卡完成'}${r.id===own?.id?' · 我':''}</span></article>`).join('');
  const list=rows.map(r=>`<li class="honor-row${r.id===own?.id?' is-me':''}"><span class="honor-rank">${r.rank}</span><div><b>${e(r.nickname)}${r.id===own?.id?'<small>我</small>':''}</b><time>${e(formatDateTime(r.achievedAt))}</time></div><span class="honor-result"><b>${endless?`${r.waves} 波`:`${r.stage} 关`}</b><small>${endless?'完成波数':r.waves?`＋${r.waves} 波`:'已通关'}</small></span></li>`).join('');
  $('#honor-entries').innerHTML=`<div class="honor-podium">${podium}</div><ol class="honor-list">${list}</ol>`;
 }
 async function load({afterSubmit=false}={}){
  const key=++generation;setBusy(true);if(!afterSubmit)message('正在读取森林荣誉…');
  try{const data=await client.load();if(key!==generation||!dialog.open)return;currentScore=client.remember(localScore());$('#honor-score').textContent=`将提交${endless?'无尽':'主线'}最佳：${scoreLabel(currentScore)}`;render(data);if(!afterSubmit)message('已更新 · 所有玩家共享这份榜单');}
  catch(error){if(key!==generation||!dialog.open||error.name==='AbortError')return;message(afterSubmit?'战绩已提交，榜单刷新失败，点击刷新可重试。':error.message,true);}
  finally{if(key===generation)setBusy(false);}
 }
 dialog.addEventListener('close',()=>{generation++;client.abort();setBusy(false);onClose();});
 dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-honor]')?.dataset.honor;
  if(action==='close')dialog.close();if(action==='refresh'&&!busy)void load();
  if(action==='main'||action==='endless')selectBoard(action);
  if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
 });
 $('.honor-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const nickname=cleanNickname($('#honor-name').value);if(!nickname){message('昵称限 1–16 个中英文字母、数字、空格、下划线或短横线。',true);return;}
  const key=++generation;setBusy(true);message('正在把你的战绩写入荣誉榜…');
  try{const result=await client.submit(nickname,currentScore);if(key!==generation||!dialog.open)return;message(`留名成功！${result.mine.nickname}，当前第 ${result.mine.rank} 名。`);await load({afterSubmit:true});}
  catch(error){if(key===generation&&dialog.open&&error.name!=='AbortError')message(error.message,true);}
  finally{if(key===generation)setBusy(false);}
 });
 function selectBoard(board){
  generation++;client.abort();endless=board==='endless';client=endless?clients.endless:clients.main;
  $('#honor-title').textContent=endless?'无尽生存榜':'森林荣誉榜';
  $('.honor-intro').textContent=endless?'同一起点，比一比谁能守住更多波。':'把你的名字，留在森林的最高处。';
  $('.honor-rules').textContent=endless?'全球生存榜 · 完成波数优先 · 前 100 名':'全球主线榜 · 通关数优先，同关比波次 · 前 100 名';
  tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.honor===board)));
  currentScore=client.remember(localScore());$('#honor-name').value=client.nickname;
  $('#honor-score').textContent=`将提交${endless?'无尽':'主线'}最佳：${scoreLabel(currentScore)}`;
  $('#honor-entries').innerHTML='';$('#honor-mine').hidden=true;void load();
 }
 return{
  remember:score=>clients.main.remember(score),
  rememberEndless:score=>clients.endless.remember(score),
  isOpen:()=>dialog.open,
  open(board='main'){onOpen();if(!dialog.open)dialog.showModal();selectBoard(board);},
  close(){if(dialog.open)dialog.close();}
 };
}
