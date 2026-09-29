import {PETS,MILESTONES,CHALLENGES,feedCost,petBonus} from './progression.mjs';
import {stats,challengeReward} from './game.mjs';
import {petPortrait} from './companion-art.mjs';
import {icon} from './icons.mjs';
const pct=n=>Math.round(n*100),number=n=>Math.round(n).toLocaleString('en-US');
export function petsPanel(s){
 return `<div class="camp-intro"><span class="camp-kicker">COMPANION CAMP</span><h3>有伙伴，冒险更有底气。</h3><p>携带一位伙伴获得加成 · 转生保留全部养成</p><div class="fish-wallet">${icon('fish')}<strong>${number(s.fish)}</strong><span>鱼干储备</span></div></div>
 <div class="pet-list">${Object.entries(PETS).map(([id,p])=>{
 const level=s.pets[id],unlocked=s.bestEver>=p.unlock,active=s.activePet===id,bonus=pct(p.base+p.step*(Math.max(1,level)-1)),cost=feedCost(s,id);
 return `<article class="pet-card${active?' carried':''}${!level?' unclaimed':''}"><div class="pet-card-top"><div class="pet-avatar" style="--pet-color:${p.color}">${petPortrait(id)}</div><div class="pet-description"><span class="pet-status">${active?'跟随出战':level?'营地待命':unlocked?'等待你的邀请':`通过第 ${p.unlock} 关解锁`}</span><h4>${p.name}<small>${level?`Lv.${level}`:'未领取'}</small></h4><p>${p.label} +${bonus}%${level&&level<20?` <em>→ +${bonus+pct(p.step)}%</em>`:''}</p></div></div><p class="pet-story">${p.story}</p>${level?`<div class="pet-level-track"><i style="width:${level/20*100}%"></i></div><div class="pet-controls"><button class="secondary-button" data-action="pet-carry" data-id="${id}" ${s.challenge?'disabled':''}>${active?'回营休息':'携带伙伴'}</button><button class="primary-button" data-action="pet-feed" data-id="${id}" ${s.challenge||level>=20||s.fish<cost?'disabled':''} title="${level>=20?'已满级':s.fish<cost?`还差 ${cost-s.fish} 鱼干`:`消耗 ${cost} 鱼干`}">${icon('fish')}${level>=20?'已满级':`喂养 · ${cost}`}</button></div>`:`<button class="primary-button wide" data-action="pet-claim" data-id="${id}" ${!unlocked||s.challenge?'disabled':''}>${unlocked?'邀请加入营地':`第 ${p.unlock} 关后可领取`}</button>`}</article>`;
 }).join('')}</div>
 <div class="milestone-heading"><h3>成长足迹</h3><span>一次领取，永久保留</span></div><div class="milestones">${MILESTONES.map(m=>{
 const claimed=s.claimedMilestones.includes(m.id),ready=s[m.field]>=m.target;
 return `<div class="milestone"><div><b>${m.label}</b><span data-milestone-progress="${m.id}">${Math.min(m.target,s[m.field])} / ${m.target} · 奖励 ${m.reward} 鱼干</span></div><button class="small-button" data-action="milestone" data-id="${m.id}" ${claimed||!ready||s.challenge?'disabled':''}>${claimed?'已领取':ready?'领取奖励':'进行中'}</button></div>`;
 }).join('')}</div><p class="muted-copy">普通关通关获得 3 鱼干，BOSS 关获得 10 鱼干。旧版累计进度继续计入成长足迹。通过第 3 关后，可在「挑战」中持续获得喂养材料。</p>`;
}
export function challengesPanel(s){
 const dps=stats(s).dps;
 return `<div class="challenge-intro">${icon('target')}<span class="camp-kicker">SUPPLY TRAINING</span><h3>鱼干补给挑战</h3><p>30 秒，集中火力击破训练木偶。<br>无门票 · 无次数限制 · 逐档解锁</p></div>${s.bestEver<3?'<div class="challenge-lock">通过第 3 关后开放。先升级火力，伙伴们在等你。</div>':''}
 <div class="challenge-list">${CHALLENGES.map((ch,tier)=>{
 const cleared=tier<s.challengeClears,unlocked=s.bestEver>=3&&tier<=s.challengeClears;
 return `<article class="challenge-card${cleared?' cleared':''}"><div class="challenge-tier">${String(tier+1).padStart(2,'0')}</div><div class="challenge-copy"><h4>${ch.name}<span>${cleared?'已首通':unlocked?'可挑战':'未解锁'}</span></h4><p>生命 ${number(ch.hp)} · 目标秒伤 ${Math.ceil(ch.hp/30)}</p><div class="challenge-loot">${icon('fish')} ${cleared?'重复':'首次'}奖励 ${challengeReward(s,tier)} 鱼干</div></div><button class="small-button" data-action="challenge-start" data-tier="${tier}" ${!unlocked||s.challenge?'disabled':''}>挑战</button></article>`;
 }).join('')}</div><div class="tip-card">${icon('info')}<p>当前小队秒伤 <b>${dps.toFixed(1)}</b>。目标秒伤仅供参考，实际通关还受射击节奏影响。进入挑战会暂停主线，装备和养成暂时锁定。</p></div>`;
}
export function companionLabel(s){if(!s.activePet)return '邀请伙伴，让远征更有底气';const p=PETS[s.activePet];return `${p.name} Lv.${s.pets[s.activePet]} · ${p.label} +${pct(petBonus(s)[p.stat]-1)}%`;}
