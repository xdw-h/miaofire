// Encounters are derived from stage position, so existing saves need no new fields.
export function healthPressure(level){return 1+Math.min(.35,Math.max(0,level-2)*.04);}
export function baseHealth(level){return Math.round(Math.min(1e120,20*1.36**(level-1)*healthPressure(level)));}
export function difficultyLabel(level){return level<3?'练习':level<8?'进阶':'险境';}
export function isBossStage(level){return level%5===0;}
export function stageReward(level){return isBossStage(level)?{gems:20,fish:10}:{gems:10,fish:3};}
export function enemyFor(level,kills){
 const kind=isBossStage(level)&&kills===9?'boss':level>=3&&[3,7].includes(kills)?'armored':kills%2?'mushroom':'slime';
 const info={
  slime:{name:'苔团',label:'普通',armor:0,coinMultiplier:1},
  mushroom:{name:'蘑菇精',label:'普通',armor:0,coinMultiplier:1},
  armored:{name:'松果甲虫',label:'护甲 · 减伤 25%',armor:.25,coinMultiplier:1.5},
  boss:{name:'古木守卫',label:'BOSS',armor:0,coinMultiplier:5},
 }[kind];
 return {kind,level,...info,hp:Math.min(1e120,Math.round(baseHealth(level)*(kind==='boss'?4.5:1)))};
}
export function damageToEnemy(damage,enemy){return Math.max(1,Math.floor(damage*(1-enemy.armor)));}
