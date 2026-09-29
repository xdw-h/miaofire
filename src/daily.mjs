export const DAILY_RULES={
 duo:{name:'双猫突围',desc:'仅两只试用猫出战，60 秒内击败 10 波敌人',target:10,types:['crossbow','sniper']},
 drought:{name:'断补给防线',desc:'自动回盾和护盾枪补盾失效，主动护盾仍可用；60 秒内击败 10 波',target:10,types:['pistol','smg','ward']},
 bossrush:{name:'巨木连战',desc:'60 秒内连战 3 个 Boss，生命和护盾不随换敌恢复',target:3,types:['crossbow','sniper','ward']},
};
export const dailyDefaults=()=>({lastClaimed:null});
export function localDate(date=new Date()){
 if(!(date instanceof Date)||!Number.isFinite(date.getTime()))return null;
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number);return y>=2000&&y<=9999&&localDate(new Date(y,m-1,d,12))===value;
}
export function dailyInfo(date=new Date()){
 const key=localDate(date);if(!validDate(key))return null;
 const days=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 const rule=Object.keys(DAILY_RULES)[days%3];return{date:key,rule,...DAILY_RULES[rule]};
}
export function dailyAvailable(s,date){return !s.daily.lastClaimed||date>s.daily.lastClaimed;}
