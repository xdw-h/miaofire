import {BOUNTIES,bountyReward} from './bounties.mjs';
export function bountiesPanel(s){
 const locked=s.bestEver<10,reason=locked?'通过第 10 关解锁':s.challenge?'先结束当前挑战':s.expedition.pending?'先选择远征祝福':'';
 return `<section class="bounties-panel"><h3>Boss 悬赏</h3><p>携带主线装备、改造与伙伴，满血满盾开战。每局 60 秒；主线暂停，失败、退出或刷新未完局不发奖。</p><p>改造材料：<strong>${s.workshop.parts}</strong> · 每种首胜 12，重复胜利 4</p>${Object.entries(BOUNTIES).map(([id,b])=>`<article class="bounty-card"><h4>${b.name}</h4><p>${b.desc}</p><span>${s.bounties.cleared.includes(id)?'重复':'首胜'}奖励：${bountyReward(s,id)} 材料</span><button class="primary-button wide" data-action="bounty-start" data-id="${id}" ${reason?'disabled':''}>${reason||'挑战'+b.name}</button></article>`).join('')}</section>`;
}
