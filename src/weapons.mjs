import {damageToEnemy} from './enemies.mjs';

export const TYPES = {
 pistol:{name:'松果手枪',short:'手枪',damage:5,rate:2,color:'#df9850',role:'均衡',description:'稳定点射 · 可靠的老朋友'},
 smg:{name:'薄荷冲锋枪',short:'冲锋枪',damage:3,rate:3.6,color:'#57a593',role:'速射',description:'高速连发 · 快速清理普通敌人'},
 shotgun:{name:'落日霰弹枪',short:'霰弹枪',damage:12,rate:.95,color:'#d98575',role:'重击',description:'重型散射 · 每次射击结算一次伤害'},
 sniper:{name:'鹰眼狙击枪',short:'狙击枪',damage:18,rate:.5,color:'#7887bc',role:'猎王',description:'对 Boss 伤害 +35% · 低射速重击'},
 crossbow:{name:'荆棘穿甲弩',short:'穿甲弩',damage:9,rate:1.05,color:'#7b9b52',role:'穿甲',description:'无视护甲 · 克制松果甲虫'},
 rocket:{name:'熔果火箭筒',short:'火箭筒',damage:24,rate:.38,color:'#d87942',role:'收割',description:'目标生命 ≤30% 时伤害 +50%'},
 ward:{name:'星萤护盾枪',short:'护盾枪',damage:4,rate:1.6,color:'#58aebe',role:'援护',description:'每次开火补充小队护盾 · 火力较低'},
};
export function wardCharge(tier){return Math.round(2*1.5**tier);}
export function weaponTrait(weapon){return weapon.type==='ward'?`每次开火补盾 +${wardCharge(weapon.tier)} · 主线 / 每日，断补给除外`:TYPES[weapon.type].description;}
export function resolveWeaponShot(cat,enemy,hp){
 const bonus=cat.type==='sniper'&&enemy.kind==='boss'?1.35:cat.type==='rocket'&&hp<=enemy.hp*.3?1.5:1;
 const damage=damageToEnemy(cat.damage*bonus,cat.type==='crossbow'?{armor:0}:enemy);
 return {damage,bonus:bonus>1,armored:enemy.armor>0&&cat.type!=='crossbow'};
}
