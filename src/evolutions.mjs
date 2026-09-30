import {PETS, PET_IDS} from './progression.mjs';
import {defenseStats} from './survival.mjs';

export const EVOLUTION_BRANCHES = {
  attack: {name:'攻击进化', short:'攻击', skill:'爆发射击', cooldown:24, duration:5, description:'进攻型伙伴效果 ×1.5，释放后 5 秒伤害 +35%'},
  guardian: {name:'守护进化', short:'守护', skill:'守护月环', cooldown:28, duration:4, description:'防御或恢复效果 ×1.5，立即恢复 25% 生命与护盾，4 秒减伤 25%'},
};

const fail=message=>({ok:false,message}),ok=message=>({ok:true,message});

export function evolutionDefaults(){
  return {
    petEvolution:Object.fromEntries(PET_IDS.map(id=>[id,null])),
    petSkillCooldown:Object.fromEntries(PET_IDS.map(id=>[id,0])),
    petSkillDuration:Object.fromEntries(PET_IDS.map(id=>[id,0])),
  };
}

export function ensureEvolutionState(s){
  const defaults=evolutionDefaults();
  for(const key of Object.keys(defaults)){
    s[key]??={};
    for(const id of PET_IDS)s[key][id]??=defaults[key][id];
  }
  return s;
}

export function evolutionInfo(s,id=s.activePet){
  ensureEvolutionState(s);
  const branch=id&&s.petEvolution[id];
  return branch&&EVOLUTION_BRANCHES[branch]?{id,branch,...EVOLUTION_BRANCHES[branch]}:null;
}

export function evolvePet(s,id,branch){
  if(s.challenge)return fail('挑战中不能进化伙伴');
  const p=PETS[id];
  if(!p||!EVOLUTION_BRANCHES[branch])return fail('请选择有效的进化分支');
  if((s.pets?.[id]??0)<10)return fail('伙伴达到 Lv.10 后才能进化');
  ensureEvolutionState(s);
  if(s.petEvolution[id])return fail('这位伙伴已经完成进化');
  s.petEvolution[id]=branch;
  return ok(`${p.name}完成${EVOLUTION_BRANCHES[branch].name}`);
}

export function petSkillState(s,id=s.activePet){
  const info=evolutionInfo(s,id);
  if(!info)return null;
  return {...info,cooldown:Math.max(0,s.petSkillCooldown[id]||0),duration:Math.max(0,s.petSkillDuration[id]||0)};
}

export function petSkillEffects(s){
  if(s.challenge?.run)return petSkillEffects(s.challenge.run);
  if(s.challenge)return {offense:1,damageReduction:0};
  const skill=petSkillState(s);
  if(!skill||skill.duration<=0)return {offense:1,damageReduction:0};
  return skill.branch==='attack'?{offense:1.35,damageReduction:0}:{offense:1,damageReduction:.25};
}

export function castPetSkill(s,id=s.activePet){
  if(s.challenge)return fail('挑战中不能释放伙伴技能');
  if(s.status!=='playing')return fail('当前无法释放伙伴技能');
  const skill=petSkillState(s,id);
  if(!skill)return fail('请先携带已进化的伙伴');
  if(skill.cooldown>1e-8)return fail(`伙伴技能冷却中，还需 ${Math.ceil(skill.cooldown)} 秒`);
  ensureEvolutionState(s);
  s.petSkillCooldown[id]=skill.cooldown+skill.duration+EVOLUTION_BRANCHES[skill.branch].cooldown-skill.duration;
  s.petSkillDuration[id]=EVOLUTION_BRANCHES[skill.branch].duration;
  if(skill.branch==='guardian'){
    const d=defenseStats(s),v=s.survival;
    v.hp=Math.min(d.maxHp,v.hp+d.maxHp*.25);
    v.shield=Math.min(d.maxShield,v.shield+d.maxShield*.25);
  }
  return {...ok(`${PETS[id].name}释放${skill.skill}`),event:{type:'pet-skill',id,branch:skill.branch,duration:EVOLUTION_BRANCHES[skill.branch].duration}};
}

export function tickPetSkill(s,dt){
  ensureEvolutionState(s);
  const step=Math.max(0,Number.isFinite(dt)?dt:0);
  for(const id of PET_IDS){
    s.petSkillCooldown[id]=Math.max(0,(s.petSkillCooldown[id]||0)-step);
    s.petSkillDuration[id]=Math.max(0,(s.petSkillDuration[id]||0)-step);
  }
  return s;
}
