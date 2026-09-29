export const SKILLS={
 shield:{name:'紧急护盾',symbol:'⬡',cooldown:18,desc:'恢复 50% 护盾上限 · 冷却 18 秒'},
 burst:{name:'集火爆发',symbol:'✦',cooldown:22,desc:'伤害 +60%，持续 5 秒 · 冷却 22 秒'},
 heal:{name:'急救鱼干',symbol:'✚',cooldown:25,desc:'恢复 25% 生命上限 · 冷却 25 秒，不消耗鱼干'},
};
export const skillDefaults=()=>({cooldowns:{shield:0,burst:0,heal:0},burst:0});
export function tickSkills(b,dt){for(const key of Object.keys(SKILLS))b.skills.cooldowns[key]=Math.max(0,b.skills.cooldowns[key]-dt);b.skills.burst=Math.max(0,b.skills.burst-dt);}
