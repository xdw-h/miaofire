import {createGame, advance, upgrade, drawWeapon, equipWeapon, unequipWeapon, mergeWeapons, rebirth, retry, stats, weaponPower, upgradeCost, treeHealth, rebirthReward, TYPES, TIERS, UPGRADE_INFO, INVENTORY_LIMIT} from './game.mjs';
import {loadGame, saveGame, SAVE_KEY} from './storage.mjs';
import {ForestScene} from './scene.mjs';
import {icon, weaponSvg} from './icons.mjs';
import {startChallenge,exitChallenge,battleState,targetHealth,challengeReward,currentEnemy,stageReward} from './game.mjs';
import {isBossStage} from './enemies.mjs';
import {defenseStats,bossCharging,bossDamage,BOSS_CYCLE,SHIELD_DELAY} from './survival.mjs';
import {MILESTONES,CHALLENGES,petBonus,claimPet,carryPet,feedPet,claimMilestone,availableRewards} from './progression.mjs';
import {petsPanel,challengesPanel,companionLabel} from './progression-ui.mjs';

let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('Unavailable');},setItem(){throw Error('Unavailable');}}; }
const loaded = loadGame(storage);
let state = loaded.state, saveBlocked = loaded.blocked, selectedTab = 'growth', manualPause = false, soundOn = false;
let audioContext, lastSound = 0, dialogHandler = null, saveFailed = false, bossReportTimer;
const $ = selector => document.querySelector(selector);
const money = n => n >= 1e8 ? `${(n/1e8).toFixed(1)}亿` : n >= 1e4 ? `${(n/1e4).toFixed(1)}万` : Math.floor(n).toLocaleString('en-US');
const decimal = n => n >= 1e4 ? money(n) : n.toFixed(1).replace(/\.0$/, '');

$('#app').innerHTML = `
<div class="shell">
  <header class="topbar">
    <div class="brand"><div class="brand-mark">${icon('paw')}</div><div><div class="brand-name">喵火前线</div><div class="brand-sub">MIAOFIRE · IDLE ADVENTURE</div></div></div>
    <nav class="nav-actions" aria-label="游戏工具"><span class="nav-label"><i></i>一场轻松的森林远征</span><button class="text-button" data-action="guide" aria-label="玩法指南">${icon('info')}玩法指南</button><button class="icon-button" data-action="settings" aria-label="设置">${icon('gear')}</button></nav>
  </header>
  <section class="intro" aria-label="冒险与资源">
    <div><div class="eyebrow">LITTLE PAWS. BIG FIREPOWER.</div><h1>小爪子，大火力。</h1><p>让猫咪忙着冒险，你只管享受变强的快乐。</p></div>
    <div class="resources">
      <div class="resource"><div class="resource-icon">${icon('coin')}</div><div><strong id="coins">0</strong><span>金币</span></div></div>
      <div class="resource gems"><div class="resource-icon">${icon('gem')}</div><div><strong id="gems">30</strong><span>钻石</span></div></div>
      <div class="resource crystals"><div class="resource-icon">${icon('crystal')}</div><div><strong id="crystals">0</strong><span>紫晶</span></div></div>
      <div class="resource fish"><div class="resource-icon">${icon('fish')}</div><div><strong id="fish">0</strong><span>鱼干</span></div></div>
    </div>
  </section>
  <div id="warning" class="warning" role="alert" hidden></div>
  <main class="workspace">
    <section class="battle-column" aria-label="森林战斗">
      <div class="battle-card">
        <div class="scene-wrap">
          <canvas id="scene" class="scene" role="img" aria-label="猫咪小队在森林中自动迎战怪物和古木守卫，战斗信息显示在画面上方和下方。"></canvas>
          <div class="field-top"><div><div class="chapter-tag">${icon('leaf')} FOREST EXPEDITION</div><div class="stage-title" id="stage-title">第 1 关 · 初入松林</div><div class="stage-sub" id="stage-sub">给这片森林一点小小的猫咪震撼</div></div><div class="timer" id="timer-wrap">${icon('clock')}<span id="timer">01:00</span></div></div>
          <div class="tree-label"><div class="tree-label-top"><span id="tree-name">苔团</span><span id="tree-index">1 / 10</span></div><div class="health-track" role="progressbar" aria-label="敌人剩余生命" aria-valuemin="0" aria-valuemax="100" id="health-track"><div class="health-fill" id="health-fill"></div></div><div class="health-number" id="health-number">20 / 20</div><span class="enemy-trait" id="enemy-trait">普通</span></div>
          <div class="live-badge"><i></i><span id="live-label">自动战斗中</span></div>
          <div class="scene-tools"><button class="icon-button" data-action="sound" aria-label="开启声音" aria-pressed="false" id="sound-toggle">${icon('mute')}</button><button class="icon-button" data-action="pause" aria-label="暂停战斗" aria-pressed="false" id="pause-toggle">${icon('pause')}</button></div>
          <div id="stage-flash" class="stage-flash" aria-hidden="true"></div>
          <div id="no-cats" class="no-cats" hidden>小队还没有武器。打开「武器」，装备后就会自动出战。</div>
          <div id="battle-overlay" class="battle-overlay" hidden><div class="overlay-card">${icon('paw')}<h2 id="overlay-title">猫咪休息中</h2><p id="overlay-copy">伸个懒腰，冒险等你回来。</p><button class="primary-button wide" id="overlay-action" data-action="resume">继续冒险 ${icon('play')}</button></div></div>
        </div>
        <section class="defense-panel" aria-label="小队生命与护盾">
          <div class="defense-heading"><b>小队防线</b><span id="shield-status">护盾就绪 · 自动防御</span></div>
          <div class="defense-meters"><div class="defense-meter health-meter"><div>${icon('health')}<span>生命</span><strong id="team-hp">100 / 100</strong></div><div class="defense-track" id="team-hp-track" role="progressbar" aria-label="小队生命" aria-valuemin="0" aria-valuemax="100"><i id="team-hp-fill"></i></div></div><div class="defense-meter shield-meter"><div>${icon('shield')}<span>护盾</span><strong id="team-shield">60 / 60</strong></div><div class="defense-track" id="team-shield-track" role="progressbar" aria-label="小队护盾" aria-valuemin="0" aria-valuemax="100"><i id="team-shield-fill"></i></div></div></div>
          <div class="boss-warning" id="boss-warning"><strong id="boss-warning-title">护盾优先吸收伤害</strong><span id="boss-warning-copy">进入新关或重试时恢复满状态</span><div class="charge-track" id="charge-track" hidden><i id="charge-fill"></i></div></div>
          <div class="defense-feedback" id="defense-feedback" role="status" aria-live="polite" hidden></div>
        </section>
        <div class="progress-strip"><div class="progress-heading"><b id="progress-label">本关进度 · 0 / 10</b><span id="stage-reward">通关 <b>+10 钻石 · +3 鱼干</b></span></div><div class="stage-path" id="stage-path" aria-hidden="true">${Array.from({length:10},(_,i)=>`<span class="path-stop${i===9?' finish':''}">${i===9?icon('gem'):''}</span>`).join('')}</div></div>
      </div>
      <div id="boss-report" class="boss-report" role="status" hidden></div>
      <div class="squad-row" id="squad" aria-label="出战小队"></div>
      <button class="companion-strip" data-action="tab" data-tab="pets">${icon('paw')}<span id="companion-label">邀请伙伴，让远征更有底气</span><span id="pet-notification"></span>${icon('arrow')}</button>
      <div class="challenge-banner" id="challenge-banner" hidden><span>补给挑战中 · 主线已暂停</span><button class="secondary-button" data-action="challenge-exit">退出挑战</button></div>
      <div class="combat-info"><span>${icon('target')}小队秒伤 <strong id="dps">10</strong></span><span>${icon('wood')}累计击败 <strong id="total-kills">0</strong></span><span>${icon('trophy')}最高通关 <strong id="best">0</strong></span></div>
    </section>
    <aside class="side-panel" aria-label="小队养成">
      <div class="panel-heading"><h2>猫咪作战室</h2><span id="squad-count">1 / 3 出战</span></div>
      <div class="tabs" role="tablist" aria-label="养成系统"><button class="tab active" id="tab-growth" role="tab" aria-selected="true" aria-controls="panel-body" data-action="tab" data-tab="growth">${icon('up')}成长</button><button class="tab" id="tab-weapons" role="tab" aria-selected="false" aria-controls="panel-body" tabindex="-1" data-action="tab" data-tab="weapons">${icon('backpack')}武器</button><button class="tab" id="tab-pets" role="tab" aria-selected="false" aria-controls="panel-body" tabindex="-1" data-action="tab" data-tab="pets">${icon('paw')}伙伴</button><button class="tab" id="tab-challenges" role="tab" aria-selected="false" aria-controls="panel-body" tabindex="-1" data-action="tab" data-tab="challenges">${icon('target')}挑战</button><button class="tab" id="tab-rebirth" role="tab" aria-selected="false" aria-controls="panel-body" tabindex="-1" data-action="tab" data-tab="rebirth">${icon('refresh')}转生</button></div>
      <div class="panel-body" id="panel-body" role="tabpanel" aria-labelledby="tab-growth"></div>
      <div class="supply-card"><div class="supply-icon">${icon('chest')}</div><div class="supply-copy"><b>森林补给站</b><span>普通关 10 钻石 · BOSS 关 20 钻石</span></div><button class="supply-link" data-action="tab" data-tab="weapons" aria-label="前往武器补给站">${icon('arrow')}</button></div>
    </aside>
  </main>
  <footer class="footer"><span>${icon('leaf')}慢一点也没关系，猫咪会一直向前。</span><span id="save-status"><i class="save-dot"></i>进度保存在此浏览器</span></footer>
</div>
<div id="toasts" class="toast-stack" role="status" aria-live="polite" aria-atomic="false"></div>
<dialog class="dialog-backdrop" id="dialog" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title"></h2><button class="icon-button" data-action="close-dialog" aria-label="关闭弹窗">${icon('close')}</button></div><div id="dialog-content" class="dialog-content"></div></dialog>`;

const scene = new ForestScene($('#scene'));
scene.onCoins=()=>{
  if(scene.reduceMotion||document.querySelectorAll('.coin-flight').length>=12)return;
  const from=$('#scene').getBoundingClientRect(),to=$('#coins').getBoundingClientRect();
  for(let i=0;i<3;i++){
    const dot=document.createElement('i');dot.className='coin-flight';
    const x=from.left+from.width*.75+i*5,y=from.top+from.height*.6;
    dot.style.left=`${x}px`;dot.style.top=`${y}px`;
    dot.style.setProperty('--coin-x',`${to.left+to.width/2-x}px`);dot.style.setProperty('--coin-y',`${to.top+to.height/2-y}px`);
    dot.style.animationDelay=`${i*.045}s`;dot.setAttribute('aria-hidden','true');document.body.append(dot);setTimeout(()=>dot.remove(),800);
  }
};
const dialog = $('#dialog');
function notify(message, error=false) {
  const el = document.createElement('div'); el.className=`toast${error?' error':''}`; el.textContent=message;
  $('#toasts').append(el);
  while($('#toasts').children.length>3) $('#toasts').firstElementChild.remove();
  setTimeout(()=>{el.classList.add('fading');setTimeout(()=>el.remove(),300);},2800);
}
function warning(message) { $('#warning').textContent=message; $('#warning').hidden=!message; }
function persist() {
  if(saveBlocked) {$('#save-status').textContent='临时试玩 · 原存档已保留';return;}
  const result=saveGame(storage,state);
  if(!result.ok) {if(!saveFailed)warning(result.warning);saveFailed=true;$('#save-status').textContent='本次进度未保存';}
  else {saveFailed=false;$('#save-status').innerHTML='<i class="save-dot"></i>进度已自动保存';}
}
function sound(kind,gun='pistol') {
  if(!soundOn) return;
  try {
    const now=performance.now();
    if(kind==='shot'&&now-lastSound<(gun==='smg'?65:95))return;
    if(kind==='shot')lastSound=now;
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime;
    o.type=kind==='shot'?(gun==='smg'?'sawtooth':'triangle'):'sine';
    const pitch=gun==='shotgun'?130:gun==='smg'?310:220;
    o.frequency.setValueAtTime(kind==='hurt'?170:kind==='shot'?pitch:kind==='kill'?700:520,t);
    o.frequency.exponentialRampToValueAtTime(kind==='hurt'?55:kind==='shot'?pitch*.32:kind==='kill'?1100:880,t+.09);
    g.gain.setValueAtTime(kind==='shot'?(gun==='shotgun'?.032:gun==='smg'?.009:.019):.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);
    o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.14);
  } catch {soundOn=false;syncSound();notify('当前浏览器暂不支持声音',true);}
}
function showDialog(title, content, handler=null) {
  if(dialog.open)dialog.close();
  $('#dialog-title').textContent=title;$('#dialog-content').innerHTML=content;dialogHandler=handler;
  dialog.showModal();updateHUD();
}
function closeDialog(){dialog.close();dialogHandler=null;updateHUD();}
dialog.addEventListener('click',e=>{
  const target=e.target.closest('button');
  if(target?.dataset.modal){dialogHandler?.(target.dataset.modal,target);}
  else if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}
});
dialog.addEventListener('close',()=>updateHUD());
function actionResult(result, quiet=false) {
  if(result.ok){lastRewardCount=availableRewards(state);persist();renderPanel();renderSquad();updateHUD();sound('upgrade');}
  if(!quiet||!result.ok)notify(result.message,!result.ok);
  return result.ok;
}
function setTab(tab) {
  if(!['growth','weapons','pets','challenges','rebirth'].includes(tab))return;
  selectedTab=tab;
  document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;});
  $('#panel-body').setAttribute('aria-labelledby',`tab-${tab}`);renderPanel();
}
$('.tabs').addEventListener('keydown',e=>{
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  const tabs=['growth','weapons','pets','challenges','rebirth'];let i=tabs.indexOf(selectedTab);
  if(e.key==='ArrowRight')i=(i+1)%tabs.length;else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;
  e.preventDefault();setTab(tabs[i]);$(`#tab-${tabs[i]}`).focus();
});
function upgradeDetail(kind) {
  const s=stats(state);
  if(kind==='attack')return `伤害 ×${decimal(s.attack)} <em>→ ×${decimal(s.attack*1.22)}</em>`;
  if(kind==='speed')return `射速 ×${s.speed.toFixed(2)} <em>→ ×${(s.speed+.07*petBonus(state).speed).toFixed(2)}</em>`;
  if(kind==='health'){const n=defenseStats(state).maxHp;return `生命 ${n} <em>→ ${n+20}</em>`;}
  if(kind==='shield'){const n=defenseStats(state).maxShield;return `护盾 ${n} <em>→ ${n+15}</em>`;}
  return `收益 ×${s.income.toFixed(2)} <em>→ ×${(s.income+.16*petBonus(state).income).toFixed(2)}</em>`;
}
function renderPanel() {
  if(selectedTab==='growth') {
    $('#panel-body').innerHTML=`<div class="section-label"><span>一点升级，一大步冒险</span><b>金币养成</b></div><div class="upgrade-list">${Object.entries(UPGRADE_INFO).map(([key,info])=>`<div class="upgrade-row"><div class="upgrade-symbol">${icon(key)}</div><div><div class="upgrade-title">${info.name}<small>Lv.${state.upgrades[key]}</small></div><div class="upgrade-detail">${state.upgrades[key]>=info.cap?'已经练到炉火纯青':upgradeDetail(key)}</div></div><button class="buy-button" data-action="upgrade" data-kind="${key}" aria-label="升级${info.name}" id="buy-${key}"><span>${icon('coin')}<b>${money(upgradeCost(state,key))}</b></span><small>升级 ${icon('up').replace('class="icon ', 'class="icon inline-icon ')}</small></button></div>`).join('')}</div><div class="tip-card">${icon('leaf')}<p><b>小队长的建议</b><br>先提升攻击力，再给伙伴配上武器。<br>Boss 会蓄力反击，生命与护盾也要强化。</p></div>`;
  } else if(selectedTab==='weapons') {
    $('#panel-body').innerHTML=`<div class="draw-box">${icon('chest')}<h3>打开一份森林补给</h3><p>随机获得一把 C 级武器 · 三种类型等概率</p><button class="primary-button wide" data-action="draw" id="draw-button">${icon('gem')}10 钻石 · 抽取武器</button></div><div class="section-label"><span>武器背包 <span class="count-pill">${state.inventory.length} / ${INVENTORY_LIMIT}</span></span><b>同款同级 ×2 可合成</b></div><div class="inventory">${[...state.inventory].sort((a,b)=>b.tier-a.tier||Number(state.equipment.includes(b.id))-Number(state.equipment.includes(a.id))).map(weaponCard).join('')}</div><p class="muted-copy">装备一把武器，就会多一只猫咪出战。合成前请先卸下武器；合成后类型随机，等级提升一级。</p>`;
  } else if(selectedTab==='pets'){
    $('#panel-body').innerHTML=petsPanel(state);
  } else if(selectedTab==='challenges'){
    $('#panel-body').innerHTML=challengesPanel(state);
  } else {
    $('#panel-body').innerHTML=`<div class="rebirth-card"><div class="rebirth-orb">${icon('crystal')}</div><h3>新的起点，更强的你</h3><p>把这趟旅途化成紫晶，<br>带着永久的力量再次出发。</p><div class="rebirth-stats"><div><strong id="rebirth-reward">+${rebirthReward(state)}</strong><span>本次可得紫晶</span></div><div><strong>+${decimal(state.crystals*10)}%</strong><span>现有永久攻击加成</span></div></div><button class="primary-button wide" data-action="rebirth" id="rebirth-button">${icon('refresh')}开始转生</button><div class="rebirth-note"><b>保留</b> 武器、装备、钻石、紫晶、伙伴和鱼干<br><b>重置</b> 金币、金币升级和当前关卡<br>每通过 3 关获得 1 颗紫晶，每颗永久增加 10% 基础攻击力。</div></div>`;
  }
  updateButtons();
  if(state.challenge){
    $('#panel-body').insertAdjacentHTML('afterbegin','<div class="panel-lock">挑战中，装备与养成暂时锁定</div>');
    $('#panel-body').querySelectorAll('button').forEach(b=>b.disabled=true);
  }
}
function mergePartner(w) {return state.inventory.find(other=>other.id!==w.id&&other.type===w.type&&other.tier===w.tier&&!state.equipment.includes(other.id));}
function weaponCard(w) {
  const equipped=state.equipment.includes(w.id), slot=state.equipment.indexOf(w.id), canMerge=!equipped&&w.tier<4&&mergePartner(w);
  const mergeReason=w.tier===4?'已达到最高等级':equipped?'先卸下武器才能合成':'还需要一把同类型同等级的未装备武器';
  return `<article class="weapon-card${equipped?' equipped':''}" data-weapon="${w.id}"><div class="weapon-card-top"><span class="tier t${w.tier}">${TIERS[w.tier]}</span><span class="equip-tag">${equipped?`队员 ${slot+1} · 出战中`:'待命'}</span></div>${weaponSvg(w.type,w.tier)}<h4>${TYPES[w.type].name}</h4><p>秒伤 ${decimal(weaponPower(state,w).dps)}</p><div class="weapon-actions"><button class="small-button" data-action="${equipped?'unequip':'equip'}" data-id="${w.id}" data-slot="${slot}" aria-label="${equipped?'卸下':'装备'}${TIERS[w.tier]}级${TYPES[w.type].name}">${equipped?'卸下':'装备'}</button><button class="small-button merge" data-action="merge" data-id="${w.id}" ${canMerge?'':'disabled'} title="${canMerge?'消耗两把同款同级武器，随机获得更高一级武器':mergeReason}" aria-label="合成${TIERS[w.tier]}级${TYPES[w.type].name}">合成</button></div></article>`;
}
function renderSquad() {
  $('#squad').innerHTML=state.equipment.map((id,i)=>{
    const w=state.inventory.find(w=>w.id===id);
    return w?`<div class="squad-slot">${weaponSvg(w.type,w.tier)}<div><span class="slot-title">队员 ${i+1} · 出战中</span><b>${TYPES[w.type].short}<small>${TIERS[w.tier]} 级</small></b></div></div>`:`<button class="squad-slot empty-slot" data-action="tab" data-tab="weapons" aria-label="为第${i+1}只猫装备武器"><div class="empty-icon">${icon('plus')}</div><div><span class="slot-title">队员 ${i+1}</span><b>装备以出战</b></div></button>`;
  }).join('');
}
function updateButtons() {
  if(selectedTab==='growth') for(const [key,info] of Object.entries(UPGRADE_INFO)) {
    const b=$(`#buy-${key}`),max=state.upgrades[key]>=info.cap,cost=upgradeCost(state,key);
    b.disabled=!!state.challenge||max||state.coins<cost;
    b.title=max?'已达到最高等级':state.coins<cost?`还差 ${money(cost-state.coins)} 金币`:`花费 ${money(cost)} 金币`;
    b.querySelector('small').textContent=max?'已满级':state.coins<cost?`差 ${money(cost-state.coins)}`:'升级 ↑';
  }
  if(selectedTab==='weapons') {const b=$('#draw-button');b.disabled=!!state.challenge||state.gems<10||state.inventory.length>=INVENTORY_LIMIT;b.title=state.gems<10?'通关获得钻石后再来':'随机获得一把 C 级武器';}
  if(selectedTab==='rebirth') {const b=$('#rebirth-button'),r=rebirthReward(state);b.disabled=!!state.challenge||r<1;$('#rebirth-reward').textContent=`+${money(r)}`;b.innerHTML=`${icon('refresh')}${r?'开始转生':'通过第 3 关解锁'}`;}
}
function updateHUD() {
  $('#coins').textContent=money(state.coins);$('#gems').textContent=money(state.gems);$('#crystals').textContent=money(state.crystals);
  $('#fish').textContent=money(state.fish);
  if(selectedTab==='pets')for(const m of MILESTONES){const el=$(`[data-milestone-progress="${m.id}"]`);if(el)el.textContent=`${Math.min(m.target,state[m.field])} / ${m.target} · 奖励 ${m.reward} 鱼干`;}
  $('#companion-label').textContent=companionLabel(state);
  const rewards=availableRewards(state);$('#pet-notification').textContent=rewards?`${rewards} 可领取`:'';
  $('#tab-pets').classList.toggle('has-rewards',rewards>0);
  const challenge=state.challenge,battle=battleState(state),enemy=currentEnemy(state),reward=stageReward(state.level);
  updateDefenseHUD(enemy);
  $('.scene-wrap').classList.toggle('boss-battle',enemy.kind==='boss');
  $('.tree-label').classList.toggle('armored-target',enemy.kind==='armored');
  $('#enemy-trait').textContent=enemy.label;
  $('#challenge-banner').hidden=!challenge;
  const chapter=state.level<=3?'初入松林':state.level<=6?'林间深处':state.level<=10?'风语山谷':'无尽林海';
  $('#stage-title').textContent=challenge?`补给 ${challenge.tier+1} · ${CHALLENGES[challenge.tier].name}`:`第 ${state.level} 关 · ${chapter}`;
  $('#stage-sub').textContent=challenge?'集中火力！30 秒内击破训练木偶':enemy.kind==='boss'?'古木守卫现身 · 集中火力拿下丰厚补给':isBossStage(state.level)?'本关第 10 波：古木守卫 BOSS':enemy.kind==='armored'?'松果硬壳抵消 25% 伤害 · 升级火力击破它':`距离 BOSS 关还有 ${5-state.level%5} 关`;
  const seconds=Math.max(0,Math.ceil((challenge?30:60)-battle.elapsed));$('#timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('#timer-wrap').classList.toggle('urgent',seconds<=10);
  const health=targetHealth(state),ratio=battle.hp/health*100;
  $('#health-fill').style.width=`${ratio}%`;$('#health-track').setAttribute('aria-valuenow',Math.round(ratio));
  $('#health-track').setAttribute('aria-label',`${enemy.name}剩余生命`);
  $('#health-number').textContent=`${money(battle.hp)} / ${money(health)}`;
  $('#tree-name').textContent=enemy.name;
  $('#tree-index').textContent=challenge?'精英目标':enemy.kind==='boss'?'BOSS · 10 / 10':`${state.kills+1} / 10`;
  $('#progress-label').textContent=challenge?`已造成伤害 · ${Math.round(100-ratio)}%`:`本关进度 · ${state.kills} / 10`;
  $('#stage-reward').textContent=challenge?`胜利奖励 +${challenge.status==='won'?challenge.reward:challengeReward(state,challenge.tier)} 鱼干`:`通关 +${reward.gems} 钻石 · +${reward.fish} 鱼干`;
  $('#stage-path').hidden=!!challenge;
  document.querySelectorAll('.path-stop').forEach((el,i)=>{el.classList.toggle('done',i<state.kills);el.classList.toggle('current',i===state.kills);el.classList.toggle('boss-stop',!challenge&&isBossStage(state.level)&&i===9);});
  const powers=stats(state);$('#dps').textContent=decimal(powers.dps);$('#total-kills').textContent=money(state.totalKills);$('#best').textContent=state.bestEver;
  $('#squad-count').textContent=`${state.equipment.filter(Boolean).length} / 3 出战`;
  $('#no-cats').hidden=state.equipment.some(Boolean);
  const failed=battle.status==='failed'||battle.status==='won';
  $('#battle-overlay').hidden=!failed&&!manualPause;
  if(failed&&challenge){$('#overlay-title').textContent=challenge.status==='won'?'补给挑战成功！':'木偶还站着，再变强一点';$('#overlay-copy').textContent=challenge.status==='won'?`已获得 ${challenge.reward} 鱼干，奖励已保存`:'本次未获得奖励，返回主线升级火力后再来';$('#overlay-action').dataset.action='challenge-result';$('#overlay-action').innerHTML=`查看结算 ${icon('arrow')}`;}
  else if(failed){$('#overlay-title').textContent=state.failureReason==='defeat'?'小队生命耗尽':enemy.kind==='boss'?'古木守卫挡住了去路':'这个对手有点顽强';$('#overlay-copy').textContent=state.failureReason==='defeat'?'已获得的资源会保留。强化生命和护盾，再满状态挑战本关！':'时间用尽。已获得的资源会保留，升级火力后再来一次！';$('#overlay-action').dataset.action='retry';$('#overlay-action').innerHTML=`再试一次 ${icon('refresh')}`;}
  else {$('#overlay-title').textContent='猫咪休息中';$('#overlay-copy').textContent='伸个懒腰，冒险等你回来。';$('#overlay-action').dataset.action='resume';$('#overlay-action').innerHTML=`继续冒险 ${icon('play')}`;}
  $('#live-label').textContent=failed?'等待再次出发':manualPause||dialog.open?'猫咪休息中':'自动战斗中';
  const toggle=$('#pause-toggle');toggle.setAttribute('aria-label',manualPause?'继续战斗':'暂停战斗');toggle.setAttribute('aria-pressed',String(manualPause));
  toggle.innerHTML=icon(manualPause?'play':'pause');updateButtons();
}
function syncSound(){const b=$('#sound-toggle');b.setAttribute('aria-label',soundOn?'关闭声音':'开启声音');b.setAttribute('aria-pressed',String(soundOn));b.innerHTML=icon(soundOn?'sound':'mute');}
function updateDefenseHUD(enemy){
  const v=state.survival,d=defenseStats(state),charging=bossCharging(state),active=enemy.kind==='boss'&&state.status==='playing';
  for(const [key,value,max]of [['hp',v.hp,d.maxHp],['shield',v.shield,d.maxShield]]){
    $(`#team-${key}`).textContent=`${decimal(value)} / ${max}`;
    $(`#team-${key}-fill`).style.width=`${value/max*100}%`;$(`#team-${key}-track`).setAttribute('aria-valuenow',Math.round(value/max*100));
  }
  $('.defense-panel').classList.toggle('low-health',v.hp/d.maxHp<=.3);
  $('#shield-status').textContent=state.challenge?'主线防线已暂停':state.status==='failed'?'重试后满状态恢复':manualPause||dialog.open?'防线计时已暂停':v.shield>=d.maxShield?'护盾就绪 · 自动防御':v.damageAgo<SHIELD_DELAY?`${Math.max(0,SHIELD_DELAY-v.damageAgo).toFixed(1)} 秒后回盾`:'护盾恢复中 · 每秒 +8';
  $('#boss-warning').classList.toggle('charging',charging);
  $('#charge-track').hidden=!active;$('#charge-fill').style.width=`${v.bossTime/BOSS_CYCLE*100}%`;
  $('#boss-warning-title').textContent=state.challenge?'训练木偶不会反击':state.status==='failed'?state.failureReason==='defeat'?'防线失守 · 强化后再挑战':'本关时间用尽':charging?'危险！Boss 蓄力中':active?'Boss 正在准备攻击':'护盾优先吸收伤害';
  $('#boss-warning-copy').textContent=active?`${(BOSS_CYCLE-v.bossTime).toFixed(1)} 秒后重击 · ${bossDamage(state.level)} 点伤害`:state.challenge?'返回主线后继续之前的生命、护盾和蓄力进度':state.status==='failed'?'重试恢复生命和护盾，回到本关第一波':'进入新关或重试时恢复满状态';
}
function clearDefenseFeedback(){$('#defense-feedback').hidden=true;}
function revealWeapon(weapon, merged=false) {
  showDialog(merged?'合成成功':'补给送达',`<div class="draw-reveal">${weaponSvg(weapon.type,weapon.tier)}<span class="tier t${weapon.tier}">${TIERS[weapon.tier]} 级武器</span><h3>${TYPES[weapon.type].name}</h3><p>${TYPES[weapon.type].description}<br>当前秒伤 ${decimal(weaponPower(state,weapon).dps)}</p><div class="dialog-buttons"><button class="secondary-button" data-modal="back">收进背包</button><button class="primary-button" data-modal="equip">立即装备</button></div></div>`,action=>{closeDialog();if(action==='equip')equip(weapon.id);});
}
function equip(id) {
  const free=state.equipment.indexOf(null);
  if(free>=0) {actionResult(equipWeapon(state,id,free));return;}
  showDialog('选择替换的队员',`<p>三只猫咪都已出战。替换后，原武器会放回背包。</p><div class="equip-choices">${state.equipment.map((equipped,i)=>{const w=state.inventory.find(item=>item.id===equipped);return `<button class="equip-choice" data-modal="slot" data-slot="${i}">${weaponSvg(w.type,w.tier)}<div><b>队员 ${i+1} · ${TYPES[w.type].name}</b><span>${TIERS[w.tier]} 级 · 秒伤 ${decimal(weaponPower(state,w).dps)}</span></div></button>`;}).join('')}</div>`,(_,button)=>{const slot=Number(button.dataset.slot);closeDialog();actionResult(equipWeapon(state,id,slot));});
}
function guide() {
  showDialog('猫咪小队，新手出发',`<div class="guide-step"><span>01</span><div><b>自动开火，轻松赚金币</b><p>每关 60 秒，击败 10 个敌人前进。Boss 每 5 秒重击一次，攻击前蓄力 2 秒，伤害先扣护盾再扣生命。3 秒未受击后护盾每秒恢复 8；生命耗尽失败，可强化后满状态重试。第 3 关开始出现减伤 25% 的护甲怪；每 5 关的最后一波为四倍生命的古木守卫，通关共得 20 钻石和 10 鱼干。</p></div></div><div class="guide-step"><span>02</span><div><b>抽取武器，集结三只猫</b><p>开局赠送 30 钻石，通关再得 10 钻石。每次抽取消耗 10 钻石，记得把新武器装备上。</p></div></div><div class="guide-step"><span>03</span><div><b>同款合成，让火力进化</b><p>两把未装备、同类型同等级的武器，合成一把更高等级的随机武器。最高 SS 级。</p></div></div><div class="guide-step"><span>04</span><div><b>转生，带着力量重新开始</b><p>通过第 3 关后开放。紫晶永久提升攻击力，武器、钻石、伙伴和鱼干保留。</p></div></div><div class="guide-step"><span>05</span><div><b>喂养伙伴，挑战鱼干补给</b><p>第 1、3、5 关分别解锁一位伙伴，可喂养至 20 级。领取成长足迹奖励，第 3 关后挑战木偶，持续收集鱼干。</p></div></div><button class="primary-button wide" data-modal="done">明白了，出发！ ${icon('arrow')}</button><p class="muted-copy">进度保存在当前浏览器。离开页面时暂停战斗；回来刷新后，从当前关卡起点继续。</p>`,()=>closeDialog());
}
function settings() {
  showDialog('冒险设置',`<div class="settings-row"><div><b>声音</b><p>轻柔的射击与奖励音效，默认关闭。</p></div><button class="secondary-button" data-modal="sound">${soundOn?'关闭声音':'开启声音'}</button></div><div class="settings-row"><div><b>本地存档</b><p>${saveBlocked?'原存档读取失败，当前为临时试玩。':saveFailed?'当前浏览器无法保存进度。':'自动保存。刷新后从当前关卡起点继续。'}<br>仅此浏览器、此访问地址有效。</p></div></div><div class="settings-row"><div><b>重新开始</b><p>清空此游戏的全部进度，重新领取初始补给。</p></div><button class="secondary-button danger" data-modal="reset">重开游戏</button></div><p class="muted-copy">喵火前线 · 小队防线版 1.3<br>森林很大，慢慢来。</p>`,action=>{
    if(action==='sound'){soundOn=!soundOn;syncSound();if(soundOn)sound('upgrade');settings();}
    if(action==='reset')confirmReset();
  });
}
function confirmReset() {
  showDialog('确认重新开始？',`<p>这会清空本浏览器内《喵火前线》的金币、钻石、武器、紫晶、伙伴、鱼干和关卡进度。此操作无法撤销。</p><div class="dialog-buttons"><button class="secondary-button" data-modal="cancel">保留进度</button><button class="primary-button danger" data-modal="reset">确认清空并重开</button></div>`,action=>{
    if(action!=='reset'){closeDialog();return;}
    state=createGame();saveBlocked=false;warning('');scene.resetEffects();clearDefenseFeedback();manualPause=false;closeDialog();setTab('growth');renderSquad();persist();updateHUD();notify('新的旅程开始啦，30 钻石已放进背包');
  });
}

function beginChallenge(tier){
  const result=startChallenge(state,tier);
  if(result.ok){manualPause=false;scene.resetEffects();clearDefenseFeedback();setTab('challenges');}
  actionResult(result);
}
function leaveChallenge(){
  scene.resetEffects();clearDefenseFeedback();manualPause=false;actionResult(exitChallenge(state));
}
function challengeResult(){
  const ch=state.challenge;if(!ch||ch.status==='playing')return;
  showDialog(ch.status==='won'?'鱼干补给，收下啦！':'差一点，再来一次',`<div class="challenge-result"><div class="result-icon">${icon(ch.status==='won'?'fish':'target')}</div><h3>${ch.status==='won'?`+${ch.reward} 份鱼干`:'本次未获得奖励'}</h3><p>${CHALLENGES[ch.tier].name} · 剩余 ${Math.max(0,30-ch.elapsed).toFixed(1)} 秒</p><p>${ch.status==='won'?'奖励已保存，带回营地喂养伙伴吧。':'升级攻击、合成武器，或携带松鼠再挑战。'}</p></div><div class="dialog-buttons"><button class="secondary-button" data-modal="leave">返回主线</button><button class="primary-button" data-modal="retry">再次挑战</button></div>`,choice=>{
    const tier=ch.tier;closeDialog();leaveChallenge();if(choice==='retry')beginChallenge(tier);
  });
}

document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const {action,id,kind,tab}=button.dataset;
  if(action==='tab')setTab(tab);
  if(action==='upgrade')actionResult(upgrade(state,kind));
  if(action==='pause'||action==='resume'){manualPause=action==='resume'?false:!manualPause;updateHUD();persist();}
  if(action==='sound'){soundOn=!soundOn;syncSound();if(soundOn)sound('upgrade');}
  if(action==='retry'){manualPause=false;scene.resetEffects();clearDefenseFeedback();actionResult(retry(state));}
  if(action==='guide')guide();
  if(action==='settings')settings();
  if(action==='close-dialog')closeDialog();
  if(action==='pet-claim')actionResult(claimPet(state,id));
  if(action==='pet-carry')actionResult(carryPet(state,state.activePet===id?null:id));
  if(action==='pet-feed')actionResult(feedPet(state,id));
  if(action==='milestone')actionResult(claimMilestone(state,id));
  if(action==='challenge-start')beginChallenge(Number(button.dataset.tier));
  if(action==='challenge-exit'){
    if(state.challenge?.status!=='playing')leaveChallenge();
    else showDialog('返回主线？','<p>本次挑战尚未完成，退出不会获得鱼干。主线将从进入挑战前的状态继续。</p><div class="dialog-buttons"><button class="secondary-button" data-modal="stay">继续挑战</button><button class="primary-button" data-modal="leave">退出并返回</button></div>',choice=>{closeDialog();if(choice==='leave')leaveChallenge();});
  }
  if(action==='challenge-result')challengeResult();
  if(action==='draw'){const result=drawWeapon(state);if(actionResult(result,true))revealWeapon(result.weapon);}
  if(action==='equip')equip(id);
  if(action==='unequip')actionResult(unequipWeapon(state,Number(button.dataset.slot)));
  if(action==='merge') {
    const w=state.inventory.find(w=>w.id===id),other=w&&mergePartner(w);if(!other)return;
    const result=mergeWeapons(state,id,other.id);if(actionResult(result,true))revealWeapon(result.weapon,true);
  }
  if(action==='rebirth') {
    const reward=rebirthReward(state);
    showDialog('带着紫晶，重新出发',`<div class="rebirth-card"><div class="rebirth-orb">${icon('crystal')}</div><h3>获得 ${money(reward)} 颗紫晶</h3><p>永久攻击加成：+${decimal(state.crystals*10)}% → +${decimal((state.crystals+reward)*10)}%</p></div><p><b>保留：</b>武器、装备、钻石、紫晶、伙伴和鱼干。<br><b>重置：</b>金币、金币升级和当前关卡。</p><div class="dialog-buttons"><button class="secondary-button" data-modal="cancel">再冒险一会</button><button class="primary-button" data-modal="confirm">确认转生</button></div>`,choice=>{closeDialog();if(choice==='confirm'){manualPause=false;scene.resetEffects();clearDefenseFeedback();actionResult(rebirth(state));setTab('growth');}});
  }
});

let last=performance.now(),hudElapsed=0,saveElapsed=0,lastRewardCount=availableRewards(state);
function frame(now) {
  const delta=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
  const paused=manualPause||dialog.open||document.hidden||battleState(state).status!=='playing';
  if(!paused)for(const event of advance(state,delta)) {
    scene.event(event);
    if(event.type==='shot')sound('shot',event.gun);
    if(event.type==='kill')sound('kill');
    if(event.type==='boss-strike'){
      const el=$('#defense-feedback');el.hidden=false;el.classList.toggle('hurt',event.healthDamage>0);
      el.textContent=`${event.shieldBroken?'护盾破裂！ ':''}护盾吸收 ${decimal(event.shieldDamage)}${event.healthDamage>0?` · 生命 −${decimal(event.healthDamage)}`:' · 小队未受伤'}`;
      sound('hurt');updateHUD();
    }
    if(event.type==='level') {
      clearDefenseFeedback();
      const flash=$('#stage-flash');flash.textContent=event.boss?'古木守卫已击败！':`第 ${event.level-1} 关完成 · +${event.reward.fish} 鱼干`;flash.classList.remove('show');void flash.offsetWidth;flash.classList.add('show');
      if(event.boss){const report=$('#boss-report');report.hidden=false;report.textContent=`第 ${event.level-1} 关 BOSS 已击败 · +${event.reward.gems} 钻石 · +${event.reward.fish} 鱼干`;clearTimeout(bossReportTimer);bossReportTimer=setTimeout(()=>report.hidden=true,12000);}
      persist();if(['pets','challenges'].includes(selectedTab))renderPanel();if(event.level===4)notify('转生与补给挑战已解锁');
    }
    if(event.type==='failed'){persist();updateHUD();}
    if(event.type==='challenge-result'){persist();renderPanel();updateHUD();challengeResult();}
  }
  scene.draw(state,delta,manualPause||document.hidden);
  const rewardCount=availableRewards(state);
  if(rewardCount!==lastRewardCount){lastRewardCount=rewardCount;if(selectedTab==='pets')renderPanel();}
  hudElapsed+=delta;saveElapsed+=delta;
  if(hudElapsed>=.12){updateHUD();hudElapsed=0;}
  if(saveElapsed>=5){persist();saveElapsed=0;}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)persist();});
window.addEventListener('pagehide',persist);
warning(loaded.warning);renderPanel();renderSquad();updateHUD();persist();requestAnimationFrame(frame);
if(loaded.restored)notify(loaded.migrated?'旧进度已备份并升级，小队防线已就绪！':'欢迎回来！猫咪小队已经准备就绪');
