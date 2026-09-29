import {TYPES,weaponTrait} from './weapons.mjs';
import {weaponSvg,icon} from './icons.mjs';

export function arsenalPanel(){
 return `<div class="draw-box">${icon('chest')}<h3>森林军械库 · 7 种武器</h3><p>随机补给 · 七种类型等概率 · 获得 C 级武器</p><button class="primary-button wide" data-action="draw" id="draw-button">${icon('gem')}10 钻石 · 随机补给</button><button class="secondary-button wide arsenal-open" data-action="arsenal">查看图鉴 / 定向补给 · 20 钻石</button></div>`;
}
export function arsenalCatalog(s){
 const locked=!!s.challenge||s.inventory.length>=120||s.gems<20;
 const reason=s.challenge?'挑战中暂不可领取':s.inventory.length>=120?'背包已满':s.gems<20?'还需 '+(20-s.gems)+' 钻石':'20 钻石 · 领取 C 级';
 return `<p>按敌人选择配装：猎王打 Boss，穿甲对付甲虫，收割补刀，援护增加生存。基础秒伤不含条件增伤。</p><div class="arsenal-catalog">${Object.entries(TYPES).map(([type,t])=>`<article class="arsenal-item">${weaponSvg(type)}<div><span class="weapon-role">${t.role}</span><h3>${t.name}</h3><p>基础单发 ${t.damage} · 每秒 ${t.rate} 发<br>${weaponTrait({type,tier:0})}</p></div><button class="secondary-button" data-modal="order" data-type="${type}" aria-label="定向领取${t.name}" ${locked?'disabled':''}>${reason}</button></article>`).join('')}</div><p>定向补给必得所选武器。两把同款同级的未装备武器可合成随机类型的更高一级武器。</p>`;
}
