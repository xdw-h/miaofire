export function cleanNickname(value){
 if(typeof value!=='string')return null;
 const name=value.normalize('NFKC').trim().replace(/ +/g,' ');
 return [...name].length>=1&&[...name].length<=16&&/^[\p{L}\p{N} _-]+$/u.test(name)?name:null;
}
export function validScore(value){return !!value&&Number.isInteger(value.stage)&&value.stage>=0&&value.stage<=9999&&Number.isInteger(value.waves)&&value.waves>=0&&value.waves<=9&&(value.stage>0||value.waves>0);}
export function scoreFromGame(s){const score={stage:s.bestEver,waves:s.level===s.bestEver+1?s.kills:0};return validScore(score)?score:null;}
export function scoreText(score){return score?`通关 ${score.stage} 关${score.waves?` · 下一关 ${score.waves}/10 波`:''}`:'击败第一个敌人后即可留下战绩';}
export function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
