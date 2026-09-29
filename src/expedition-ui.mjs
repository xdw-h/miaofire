import {DAILY_RULES,dailyInfo,dailyAvailable} from './daily.mjs';
import {TYPES} from './weapons.mjs';
import {LINKS} from './combat-effects.mjs';
export function dailyPanel(s){
 const d=dailyInfo();if(!d)return '<p>本机日期无效，无法开启每日挑战。</p>';
 return `<article class="daily-card"><span class="camp-kicker">DAILY EXPEDITION · ${d.date}</span><h3>${d.name}</h3><p>${d.desc}</p><p>固定 B 级试用小队：${d.types.map(t=>TYPES[t].short).join('、')}。主线养成和祝福不带入，技能可用。</p><strong>${dailyAvailable(s,d.date)?'首胜 +20 钻石 · +40 鱼干':'今日奖励已领取 · 可免费练习'}</strong><button class="primary-button wide" data-action="daily-start" ${s.bestEver<3||s.challenge||s.expedition.pending?'disabled':''}>${s.bestEver<3?'通过第 3 关解锁':'开始每日挑战'}</button><small>以本机日期轮换；失败、退出或刷新不发奖。跨午夜按开战日期结算。</small></article>`;
}
export function linksGuide(){return `<div class="link-guide">${LINKS.map(l=>`<p><b>${l.name}</b> · ${l.types.map(t=>TYPES[t].short).join('＋')}<br>${l.desc}</p>`).join('')}</div>`;}
export {DAILY_RULES};
