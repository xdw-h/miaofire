import {enemyAttack} from './survival.mjs';

export const ATTACK_STYLES={
 slime:{color:'#6b9b69',light:'#d6ebad',flight:.55,arc:42,sourceY:-67},
 mushroom:{color:'#bb806a',light:'#f6d9ad',flight:.65,arc:72,sourceY:-148},
 armored:{color:'#937047',light:'#d9b775',flight:.5,arc:90,sourceY:-42},
 boss:{color:'#856b48',light:'#c9b67b',flight:.8,arc:0,sourceY:-8},
};
const clamp=n=>Math.max(0,Math.min(1,n));
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};

// Flight uses the final portion of the simulation warning: arrival and damage
// share a deadline. Nothing is launched after damage or from a stale encounter.
export function attackPresentation(s,visibleTarget){
 if(s.challenge?.kind==='daily')return attackPresentation(s.challenge.run,visibleTarget);
 if(s.status!=='playing'||s.challenge||visibleTarget!==`${s.dailyRule?'daily':'tree'}-${s.totalKills}`)return null;
 const attack=enemyAttack(s),style=ATTACK_STYLES[attack.enemy.kind],remaining=attack.cycle-s.survival.bossTime;
 const phase=remaining>attack.windup?'idle':remaining>style.flight?'windup':'flight';
 return {kind:attack.enemy.kind,enraged:attack.enraged,style,phase,progress:clamp(1-remaining/style.flight),
  windup:phase==='windup'?clamp((attack.windup-remaining)/(attack.windup-style.flight)):phase==='flight'?Math.max(0,1-(1-remaining/style.flight)*4):0};
}
export function projectilePoint(from,to,progress,arc){
 const p=clamp(progress);return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p-Math.sin(p*Math.PI)*arc};
}
function seed(c,x,y,angle,scale=1){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
 oval(c,0,0,25,17,'#86633f');oval(c,-2,-2,22,14,'#ba945f');
 c.strokeStyle='#8b693f';c.lineWidth=2.5;
 for(const xx of [-12,0,12]){c.beginPath();c.moveTo(xx-7,-9);c.lineTo(xx,1);c.lineTo(xx-7,10);c.stroke();}
 oval(c,-11,-7,7,3,'#dfc28b');c.restore();
}
function payload(c,kind,x,y,p,style){
 if(kind==='slime'){
  oval(c,x+6,y+4,25,17,style.color);oval(c,x-5,y-3,18,17,'#98bd7e');oval(c,x-10,y-9,7,4,style.light);
 }else if(kind==='mushroom'){
  for(const [dx,dy,r]of [[-11,-3,13],[9,-11,10],[10,12,9],[-3,15,6]]){
   oval(c,x+dx,y+dy,r,r,style.color);oval(c,x+dx-2,y+dy-3,r*.63,r*.55,style.light);
  }
 }else if(kind==='armored')seed(c,x,y,-p*9);
 else if(kind==='boss'){
  c.strokeStyle=style.color;c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(x,y+15);c.lineTo(x,y-15);c.moveTo(x,y);c.lineTo(x-17,y-12);c.moveTo(x,y+4);c.lineTo(x+17,y-9);c.stroke();
 }
}
export function drawAttackFlight(c,view,from,to,ground,reduceMotion){
 if(!view||view.phase!=='flight')return;
 const {kind,style,progress:p}=view;
 c.save();
 if(reduceMotion){payload(c,kind,from.x-28,from.y,0,style);c.restore();return;}
 if(kind==='boss'){
  // Roots erupt in sequence along the ground, rather than a floating slash.
  for(let i=0;i<8;i++){
   const q=i/7,age=(p-q*.78)/.22;if(age<0||age>1.6)continue;
   const x=from.x+(to.x-from.x)*q,h=42*Math.sin(Math.min(1,age)*Math.PI);
   c.globalAlpha=Math.max(0,1-age*.48);oval(c,x,ground+4,27,7,'#a79b7055');
   c.fillStyle=style.color;c.beginPath();c.moveTo(x+19,ground);c.quadraticCurveTo(x+9,ground-h,x-11,ground-h-10);c.quadraticCurveTo(x-3,ground-9,x-17,ground);c.fill();
   oval(c,x+20,ground-9-age*9,5,3,style.light);
  }
 }else{
  for(let i=6;i>0;i--){
   const q=p-i*.035;if(q<0)continue;const pt=projectilePoint(from,to,q,style.arc);
   c.globalAlpha=(1-i/7)*.45;
   if(kind==='armored'){c.save();c.translate(pt.x,pt.y);c.rotate(q*7);c.fillStyle=style.light;c.fillRect(-4,-2,8,4);c.restore();}
   else oval(c,pt.x,pt.y+(i%2?4:-4),kind==='slime'?6:8,kind==='slime'?4:8,style.color);
  }
  c.globalAlpha=1;const pt=projectilePoint(from,to,p,style.arc);payload(c,kind,pt.x,pt.y,p,style);
 }
 c.restore();
}
export function drawAttackImpact(c,kind,point,strength,shielded,broken,reduceMotion){
 if(strength<=0)return;
 const style=ATTACK_STYLES[kind]??ATTACK_STYLES.boss,u=1-strength;
 c.save();c.globalAlpha=Math.min(1,strength*2);
 if(shielded){
  c.strokeStyle=broken?'#a9d4c0':'#def3db';c.lineWidth=broken?3:5;
  c.beginPath();c.ellipse(point.x-22,point.y,30+u*12,51+u*9,0,-Math.PI*.43,Math.PI*.43);c.stroke();
 }
 for(let i=0;i<(reduceMotion?3:8);i++){
  const angle=i*Math.PI*.25,r=reduceMotion?14:12+u*48,x=point.x+Math.cos(angle)*r,y=point.y+Math.sin(angle)*r*.7+u*u*15;
  if(kind==='armored'||kind==='boss'){c.save();c.translate(x,y);c.rotate(angle+u);c.fillStyle=style.light;c.fillRect(-5,-3,10,6);c.restore();}
  else oval(c,x,y,(kind==='slime'?6:9)*strength,4*strength,style.color);
 }
 c.restore();
}
