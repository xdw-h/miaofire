import {ENDLESS_CHOICES} from './endless.mjs';
export function endlessPanel(s){
 const run=s.challenge?.kind==='endless'?s.challenge.run:null;
 return `<article class="endless-card"><span class="camp-kicker">ENDLESS GUARD · 无尽守卫</span><h3>这一波，由我们守住。</h3><p>固定 B 级三猫小队，主线养成不带入。每 5 波迎战 Boss，胜利后三选一：火力、射速或维修。</p><div class="endless-record"><span>我的最佳</span><strong>${s.endless.bestWaves}<small> 波</small></strong></div><p>每波限时 60 秒。换波保留生命、护盾和技能冷却；优先击败敌人，阻止反击。</p>${run?.endlessRun.pending?'<button class="primary-button wide" data-action="endless-choice">选择补给 · 继续守卫</button>':run?`<button class="primary-button wide" data-action="${run.status==='playing'?'challenge-exit':'challenge-result'}">${run.status==='playing'?'结束本局并结算':'查看本局结算'}</button>`:`<button class="primary-button wide" data-action="endless-start" ${s.bestEver<5||s.challenge||s.expedition.pending?'disabled':''}>${s.bestEver<5?'通过第 5 关解锁':'开始无尽守卫'}</button>`}<button class="secondary-button wide" data-action="endless-honor">查看生存榜 · 留下战绩</button><small>完成波数即时记入最佳成绩。退出或刷新结束本局；无钻石、鱼干奖励。榜单需手动留名提交。</small></article>`;
}
export function endlessChoices(s){
 const run=s.challenge?.run,d=run?.endlessRun;
 return `<p>已守住 <b>${d?.waves??0} 波</b>。选一项补给后继续，当前战斗与冷却已暂停。</p><div class="endless-choices">${ENDLESS_CHOICES.map(c=>`<button class="endless-choice" data-modal="endless-pick" data-id="${c.id}"><span>${c.id==='power'?'✦':c.id==='tempo'?'»':'♡'}</span><b>${c.name}</b><small>${c.desc}</small></button>`).join('')}</div><p class="muted-copy">关闭后仍保持暂停，可在战斗画面或挑战页重新打开。</p>`;
}
