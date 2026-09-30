import {stats, TYPES, currentEnemy,targetId} from './game.mjs';
import {drawEnemy} from './enemy-art.mjs';
import {drawCompanion} from './companion-art.mjs';
import {ImpactTimeline} from './impact-timeline.mjs';
import {attackPresentation,drawAttackFlight,drawAttackImpact} from './enemy-attack-art.mjs';
import {drawSpecialGun,drawSpecialProjectile,MUZZLE} from './weapon-art.mjs';

const CAT_COLORS = [
  {fur:'#edb674', light:'#ffe0a6', stripe:'#d68e52', ears:'#d78d75', scarf:'#65866b'},
  {fur:'#a3b9b3', light:'#d9e4d5', stripe:'#7c9690', ears:'#bc9990', scarf:'#cf9c5b'},
  {fur:'#eee4c6', light:'#fff5dd', stripe:'#c8b991', ears:'#dca294', scarf:'#bf7f68'},
];
export class ForestScene {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.time = 0; this.particles = []; this.recoil = [0,0,0]; this.shake = 0;
    this.impacts=new ImpactTimeline();this.hitFlash=0;this.entry=0;this.onCoins=null;this.targetLevel=null;this.targetEnemy=null;this.teamHit=0;this.shieldImpact=false;
    this.attackFlash=0;this.attackText='';this.attackTarget=null;this.attackKind='slime';this.attackLabel='';this.attackAmount='';this.shieldBroken=false;
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.width = 1000; this.height = 625;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas); this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.height = rect.height / Math.max(1, rect.width) * 1000;
  }
  positions() {
    const g = this.height * .785;
    return [{x:268,y:g-4,scale:1.13},{x:133,y:g+18,scale:.92},{x:166,y:g-105,scale:.86}];
  }
  event(event) {
    const g = this.height * .785, positions = this.positions();
    this.impacts.add(event);
    if(event.type==='boss-strike'||event.type==='enemy-strike'){
      this.teamHit=1;this.shieldImpact=event.healthDamage===0;this.attackFlash=1;this.attackTarget=event.targetId;
      this.attackText=`${event.enemyName??'古木守卫'}反击 · ${event.healthDamage>0?`生命 −${Math.ceil(event.healthDamage)}`:`护盾 −${Math.ceil(event.shieldDamage)}`}`;
      this.attackKind=event.enemyKind??'boss';this.attackLabel=`${event.enemyName??'古木守卫'}反击`;
      this.attackAmount=event.healthDamage>0?`−${Math.ceil(event.healthDamage)} 生命`:`−${Math.ceil(event.shieldDamage)} 护盾`;
      this.shieldBroken=!!event.shieldBroken;this.shieldContact=event.shieldDamage>0;
    }
    if(event.type==='enemy-heal')this.particles.push({type:'shield-charge',x:750,y:g-230,text:`再生 +${compact(event.amount)}`,life:0,duration:.8});
    if(event.type==='bounty-shield')this.particles.push({type:'shield-charge',x:750,y:g-230,text:`护盾 +${event.amount}`,life:0,duration:1});
    if(event.type==='poison-tick'){this.teamHit=.5;this.particles.push({type:'number',x:270,y:g-120,text:`毒伤 −${event.damage}`,life:0,duration:.8});}
    if (event.type === 'shot') {
      this.targetLevel??=event.targetLevel;
      this.targetEnemy??=event.targetEnemy;
      const p = positions[event.slot]; this.recoil[event.slot] = ['shotgun','rocket'].includes(event.gun)?1.65:event.gun==='smg'?.55:1;
      const kick=this.reduceMotion?0:this.recoil[event.slot],angle=-.04-kick*(event.gun==='shotgun'?.11:.045),muzzle=MUZZLE[event.gun];
      const bounce=this.reduceMotion?0:Math.sin(this.time*3+event.slot)*1.7;
      this.particles.push({type:'bullet',x:p.x+(19-kick*10+muzzle*Math.cos(angle))*p.scale,y:p.y+(-54+bounce+muzzle*Math.sin(angle))*p.scale,tx:750,ty:g-138,life:0,duration:.15,gun:event.gun,targetId:event.targetId});
      if(event.shieldRestored>0)this.particles.push({type:'shield-charge',x:p.x,y:p.y-128*p.scale,text:`+${compact(event.shieldRestored)} 护盾`,life:0,duration:.65});
    }
    if(this.particles.length>160)this.particles.splice(0,this.particles.length-160);
  }
  resetEffects(){this.particles=[];this.impacts.clear();this.recoil=[0,0,0];this.shake=0;this.hitFlash=0;this.entry=0;this.targetLevel=null;this.targetEnemy=null;this.teamHit=0;this.shieldImpact=false;this.attackFlash=0;this.attackText='';this.attackTarget=null;}
  impact(event){
    const g=this.height*.785;
    if(event.type==='shot'){
      this.hitFlash=1;this.shake=['shotgun','rocket'].includes(event.gun)?1.3:event.gun==='smg'?.3:.65;
      const existing=event.gun==='smg'&&this.particles.find(p=>p.type==='number'&&p.targetId===event.targetId&&p.gun==='smg'&&p.life<.22);
      if(existing){existing.damage+=event.damage;existing.text=`−${compact(existing.damage)}`;existing.life=0;}
      else this.particles.push({type:'number',targetId:event.targetId,gun:event.gun,damage:event.damage,x:749+(Math.random()-.5)*60,y:g-195-Math.random()*35,text:`${event.enemyShieldDamage?'破盾 ':''}${event.link?event.link+' ':''}${event.bonus?(event.gun==='sniper'?'猎王 ':'收割 '):''}−${compact(event.damage)}`,life:0,duration:.65});
      if(!this.reduceMotion){this.particles.push({type:'spark',x:750,y:g-138,life:0,duration:event.gun==='rocket'?.26:.16,size:['shotgun','rocket'].includes(event.gun)?30:16,color:TYPES[event.gun].color});}
    }
    if (event.type === 'kill') {
      this.targetLevel=event.nextLevel??null;this.targetEnemy=event.nextEnemy??null;this.hitFlash=0;this.shake=0;this.entry=1;
      for (let i=0;i<(this.reduceMotion?2:24);i++) {
        this.particles.push({type:['slime','mushroom'].includes(event.enemyKind)?'puff':i%3?'wood':'leaf',color:event.enemyKind==='mushroom'?'#ddb89b':'#b9d5a9',x:750,y:g-100-Math.random()*130,vx:(Math.random()-.5)*260,vy:-100-Math.random()*160,life:0,duration:.7+Math.random()*.45,size:6+Math.random()*9,rotation:Math.random()*6});
      }
      if(event.coins){this.particles.push({type:'coins',x:765,y:g-260,text:`+${compact(event.coins)}`,life:0,duration:1.1});this.onCoins?.(event.coins);}
    }
    if (this.particles.length > 160) this.particles.splice(0,this.particles.length-160);
  }
  draw(s, delta, paused) {
    const c = this.ctx, w = this.width, h = this.height, g = h * .785;
    if (!paused) this.time += delta;
    const dt = paused ? 0 : delta, t = this.reduceMotion ? 0 : this.time;
    for(const event of this.impacts.tick(dt))this.impact(event);
    this.hitFlash=Math.max(0,this.hitFlash-dt*9);this.entry=Math.max(0,this.entry-dt*5);
    this.teamHit=Math.max(0,this.teamHit-dt*2.2);this.attackFlash=Math.max(0,this.attackFlash-dt);
    this.shake = Math.max(0,this.shake-dt*4);
    this.recoil = this.recoil.map(v=>Math.max(0,v-dt*9));
    c.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);
    c.clearRect(0,0,w,h);
    const sky = c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#c9e0c8'); sky.addColorStop(.72,'#edf0c6'); sky.addColorStop(1,'#d5dfa8');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    // Sunlight, drifting clouds, distant ridges and a layered pine forest.
    c.save();c.globalAlpha=.46;circle(c,584,112,55,'#fff9ce');circle(c,584,112,75,'#fff7cb33');c.restore();
    cloud(c,425+Math.sin(t*.05)*14,97,.9);cloud(c,851+Math.sin(t*.04)*17,127,.65);cloud(c,160,173,.55);
    c.fillStyle='#bcd5b6';c.beginPath();c.moveTo(0,g-210);c.bezierCurveTo(160,g-380,266,g-197,405,g-264);c.bezierCurveTo(605,g-355,646,g-320,1000,g-219);c.lineTo(1000,h);c.lineTo(0,h);c.fill();
    c.fillStyle='#a8c6a1';c.beginPath();c.moveTo(0,g-148);c.bezierCurveTo(161,g-257,259,g-224,390,g-158);c.bezierCurveTo(606,g-219,715,g-272,1000,g-139);c.lineTo(1000,h);c.lineTo(0,h);c.fill();
    for(let i=0;i<20;i++) {
      const x=i*58-15, base=g-90+Math.sin(i*1.8)*20, size=.45+Math.sin(i*2.1)**2*.28;
      pine(c,x,base,size,i%2?'#94b890':'#9cbe91');
    }
    c.fillStyle='#b6ce98';c.beginPath();c.moveTo(0,g-57);c.quadraticCurveTo(280,g-142,540,g-62);c.quadraticCurveTo(765,g-113,1000,g-56);c.lineTo(1000,h);c.lineTo(0,h);c.fill();
    // Soft forest-floor clearing connects the squad and its target.
    c.fillStyle='#d8dfae';c.beginPath();c.ellipse(532,g+60,630,133,-.035,0,Math.PI*2);c.fill();
    c.fillStyle='#e4dfb1';c.beginPath();c.ellipse(518,g+50,408,89,-.075,0,Math.PI*2);c.fill();
    c.fillStyle='#ece3bc';c.beginPath();c.ellipse(535,g+39,310,53,-.07,0,Math.PI*2);c.fill();
    for(let i=0;i<38;i++) {
      const x=(i*137.1+35)%1000, y=g-37+(i*37.4)%174;
      if (i%4===0) pebble(c,x,y,5+(i%3)*2); else grass(c,x,y,9+(i%5)*2,i%2?'#92b473':'#a1bb7b');
    }
    // Large framing foliage remains out of the central aiming lane.
    bush(c,-13,g-13,92,'#729d73','#88af7c');bush(c,995,g-18,99,'#7ca274','#97b97e');
    pine(c,32,g-87,1.45,'#719a77');pine(c,982,g-79,1.7,'#779e77');
    mushroom(c,53,g+49,.8);mushroom(c,927,g+17,.65);
    for(const [x,y] of [[401,g-47],[563,g+85],[882,g+81],[68,g+102]]) flower(c,x,y,t);
    // Keep the visual encounter until its delayed killing projectile arrives.
    c.save();
    const entry=this.reduceMotion?0:this.entry;
    c.translate(760,g+3);c.scale(1-entry*.1,1-entry*.08);c.translate(-760,-g-3);
    const visualTarget=this.impacts.targetId??targetId(s),attackView=attackPresentation(s,visualTarget);
    if(this.hitFlash>0)c.filter=`brightness(${1+this.hitFlash*.65})`;
    if(s.challenge&&!s.challenge.run)this.dummy(760,g+3,t);else this.enemy(760,g+3,this.targetEnemy??=currentEnemy(s),t,attackView);
    c.restore();
    drawCompanion(c,(s.challenge?.run||s).activePet,388,g+20,t,this.reduceMotion);
    const cats=stats(s).cats, positions=this.positions();
    for(const i of [2,1,0]) {
      const p=positions[i];
      if(cats[i]) this.cat(p.x,p.y,p.scale,i,cats[i].type,t);
      else this.emptySpot(p.x,p.y,p.scale,i);
    }
    this.drawDefense(s.challenge?.run||s,g,t,attackView);
    for(const p of this.particles) {
      p.life+=dt;const u=Math.min(1,p.life/p.duration);
      c.save();
      if(p.type==='bullet') {
        if(drawSpecialProjectile(c,p,u,this.reduceMotion)){c.restore();continue;}
        const k=u,x=p.x+(p.tx-p.x)*k,y=p.y+(p.ty-p.y)*k;
        c.strokeStyle=p.gun==='smg'?'#f8ffb7':'#fff5b5';c.lineWidth=p.gun==='shotgun'?6:4;c.lineCap='round';
        c.beginPath();c.moveTo(x-23,y+5);c.lineTo(x,y);c.stroke();
        circle(c,x,y,3,'#fffceb');
        if(p.gun==='shotgun') {for(const spread of [-2,-1,1,2]){const yy=y+spread*12*k;c.beginPath();c.moveTo(x-10,yy);c.lineTo(x,yy);c.stroke();}}
      } else if(p.type==='spark'){
        c.globalAlpha=1-u;spark(c,p.x,p.y,p.size*(1-u*.4),p.color??'#fff8c1');
      } else if(p.type==='shield-charge') {
        c.globalAlpha=1-u*u;c.strokeStyle='#9ce3df';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y+50,22+(this.reduceMotion?0:u*18),0,Math.PI*2);c.stroke();
        c.font='bold 19px "Microsoft YaHei",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#f4ffed';c.strokeText(p.text,p.x,p.y-(this.reduceMotion?0:u*20));c.fillStyle='#347f87';c.fillText(p.text,p.x,p.y-(this.reduceMotion?0:u*20));
      } else if(p.type==='number'||p.type==='coins') {
        c.globalAlpha=1-u*u;c.font=`800 ${p.type==='coins'?23:20}px "Segoe UI","Microsoft YaHei",sans-serif`;
        c.textAlign='center';c.lineWidth=4;c.strokeStyle=p.type==='coins'?'#fff5d2':'#f8f7dccc';
        c.strokeText(p.text,p.x,p.y-u*50);c.fillStyle=p.type==='coins'?'#ad8644':'#5c7750';c.fillText(p.text,p.x,p.y-u*50);
        if(p.type==='coins') {circle(c,p.x-31,p.y-u*50-8,7,'#e9bd57');circle(c,p.x-31,p.y-u*50-8,4,'#f9db78');}
      } else {
        c.globalAlpha=1-u*u;c.translate(p.x+p.vx*p.life,p.y+p.vy*p.life+220*p.life*p.life);c.rotate(p.rotation+p.life*4);
        if(p.type==='puff')ellipse(c,0,0,p.size*(1+u),p.size*.8,p.color);
        else if(p.type==='wood') {round(c,-p.size/2,-p.size/3,p.size,p.size*.6,2,'#b78e58');round(c,-p.size/2,-p.size/3,p.size,2,1,'#e4bd7d');}
        else {c.fillStyle='#86a859';c.beginPath();c.ellipse(0,0,p.size,p.size/2,0,0,Math.PI*2);c.fill();}
      }
      c.restore();
    }
    this.particles=this.particles.filter(p=>p.life<p.duration);
    // Foreground leaves give the diorama depth without covering controls.
    bush(c,-24,h+8,100,'#77995d','#9bb56f');bush(c,1036,h+18,121,'#82a15f','#a2b975');
    for(let i=0;i<6;i++) {c.save();c.globalAlpha=.5;circle(c,360+i*98+Math.sin(t*.7+i)*15,200+(i*67)%220+Math.cos(t+i)*10,2.2,'#fffce6');c.restore();}
  }
  enemy(x,y,enemy,t,attackView){drawEnemy(this.ctx,enemy.art?{...enemy,kind:enemy.art}:enemy,x,y,t,this.shake,this.reduceMotion,attackView);}
  attackFlight(view,from,to,g){drawAttackFlight(this.ctx,view,from,to,g,this.reduceMotion);}
  drawDefense(s,g,t,view){
    if(s.challenge)return;
    const c=this.ctx,positions=this.positions(),front=positions[Math.max(0,s.equipment.findIndex(Boolean))];
    const contact={x:front.x+48*front.scale,y:front.y-66*front.scale};
    for(const [i,p]of this.positions().entries()){
      if(!s.equipment[i])continue;
      c.save();
      if(s.survival.shield>0){
        c.globalAlpha=.18+(this.shieldContact?this.teamHit*.3:0);c.strokeStyle='#75bdb9';c.lineWidth=3;
        c.beginPath();c.ellipse(p.x,p.y-60*p.scale,53*p.scale,86*p.scale,0,0,Math.PI*2);c.stroke();
      }
      c.restore();
    }
    if(view)this.attackFlight(view,{x:view.kind==='boss'?720:718,y:g+view.style.sourceY},view.kind==='boss'?{x:contact.x,y:g}:contact,g);
    const hitPoint=this.attackKind==='boss'?{x:contact.x,y:front.y-18}:contact;
    drawAttackImpact(c,this.attackKind,hitPoint,this.teamHit,this.shieldContact,this.shieldBroken,this.reduceMotion);
    if(this.attackFlash>0){
      const x=front.x+26,y=front.y-176*front.scale-(this.reduceMotion?0:(1-this.attackFlash)*18);
      c.save();c.globalAlpha=Math.min(1,this.attackFlash*3);c.textAlign='center';c.font='bold 26px "Microsoft YaHei",sans-serif';
      c.lineWidth=5;c.strokeStyle='#f8f6db';c.strokeText(this.attackAmount,x,y);c.fillStyle=this.shieldImpact?'#417f77':'#ae6247';c.fillText(this.attackAmount,x,y);
      c.font='500 16px "Microsoft YaHei",sans-serif';c.strokeText(this.attackLabel,x,y+22);c.fillText(this.attackLabel,x,y+22);c.restore();
    }
  }
  dummy(x,y,t){
    const c=this.ctx,shake=this.reduceMotion?0:Math.sin(t*75)*this.shake*5;
    c.save();c.translate(x+shake,y);ellipse(c,0,2,64,15,'#65784735');
    round(c,-10,-230,20,232,5,'#9d7851');round(c,-80,-154,160,18,6,'#a98858');
    round(c,-47,-211,94,127,16,'#bc9862');round(c,-40,-205,80,114,13,'#d2b079');
    circle(c,0,-150,38,'#8b7454');circle(c,0,-150,30,'#ebd39e');circle(c,0,-150,22,'#be875c');circle(c,0,-150,12,'#eee0b6');circle(c,0,-150,5,'#a2704e');
    round(c,-33,-266,66,49,12,'#c5a471');round(c,-38,-272,76,13,5,'#788966');
    circle(c,-12,-243,4,'#605a45');circle(c,12,-243,4,'#605a45');
    c.strokeStyle='#927550';c.lineWidth=3;c.beginPath();c.moveTo(-7,-230);c.lineTo(7,-230);c.stroke();
    round(c,-51,-9,102,10,4,'#987e52');grass(c,-48,3,17,'#8da064');c.restore();
  }
  emptySpot(x,y,scale,index) {
    const c=this.ctx;c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha=.56;
    ellipse(c,0,5,41,10,'#a1ad784f');
    c.strokeStyle='#9cab7b';c.lineWidth=2;c.setLineDash([5,5]);c.beginPath();c.ellipse(0,0,35,10,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle='#7e9467';c.font='500 13px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillText(`队员 ${index+1}`,0,30);c.restore();
  }
  cat(x,y,scale,index,gun,t) {
    const c=this.ctx, p=CAT_COLORS[index], recoil=this.recoil[index];
    const bounce=this.reduceMotion?0:Math.sin(t*3+index)*1.7;
    c.save();c.translate(x-(this.reduceMotion?0:this.teamHit*6),y);c.scale(scale,scale);
    ellipse(c,3,3,42,11,'#6e7d4c35');c.translate(this.reduceMotion?0:-recoil*5,bounce);
    // Tail, boots, round body and tiny adventure backpack.
    c.strokeStyle=p.fur;c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(-25,-29);c.bezierCurveTo(-59,-21,-67,-48,-54,-56);c.stroke();
    c.strokeStyle=p.stripe;c.lineWidth=5;c.beginPath();c.moveTo(-53,-29);c.lineTo(-59,-36);c.stroke();
    round(c,-36,-68,17,36,8,index===1?'#b99365':'#758e63');
    ellipse(c,-13,-5,14,9,'#6b7654');ellipse(c,19,-5,14,9,'#6b7654');
    ellipse(c,1,-40,32,37,p.fur);ellipse(c,9,-34,20,24,p.light);
    // Ear outline and a large, expressive head.
    c.fillStyle=p.fur;c.beginPath();c.moveTo(-34,-85);c.lineTo(-34,-124);c.quadraticCurveTo(-31,-132,-25,-124);c.lineTo(-5,-106);c.lineTo(14,-106);c.lineTo(36,-123);c.quadraticCurveTo(41,-124,39,-116);c.lineTo(39,-78);c.closePath();c.fill();
    c.fillStyle=p.ears;c.beginPath();c.moveTo(-28,-115);c.lineTo(-27,-94);c.lineTo(-12,-103);c.fill();c.beginPath();c.moveTo(33,-114);c.lineTo(32,-94);c.lineTo(19,-103);c.fill();
    ellipse(c,3,-85,41,32,p.fur);ellipse(c,18,-74,27,19,p.light);
    c.strokeStyle=p.stripe;c.lineWidth=4;c.beginPath();c.moveTo(-5,-112);c.lineTo(-2,-102);c.moveTo(6,-114);c.lineTo(7,-104);c.moveTo(-33,-83);c.lineTo(-24,-79);c.moveTo(-32,-74);c.lineTo(-24,-72);c.stroke();
    const blink=Math.sin(t*.6+index*2)>.995;
    c.strokeStyle='#3f4d3b';c.lineWidth=3;
    if(blink){c.beginPath();c.moveTo(-2,-87);c.lineTo(4,-87);c.moveTo(26,-87);c.lineTo(32,-87);c.stroke();}
    else {ellipse(c,1,-86,3.3,4.7,'#3c4938');ellipse(c,28,-86,3.3,4.7,'#3c4938');circle(c,2,-88,1,'#fff8dc');circle(c,29,-88,1,'#fff8dc');}
    ellipse(c,-5,-76,7,3,'#de9b7766');ellipse(c,33,-76,6,3,'#de9b7766');
    c.fillStyle='#aa7b65';c.beginPath();c.moveTo(12,-79);c.lineTo(20,-79);c.lineTo(16,-74);c.fill();
    c.strokeStyle='#977b5b';c.lineWidth=1.5;c.beginPath();c.moveTo(16,-74);c.quadraticCurveTo(13,-69,10,-73);c.moveTo(16,-74);c.quadraticCurveTo(19,-69,23,-73);c.stroke();
    c.fillStyle=p.scarf;c.beginPath();c.moveTo(-22,-59);c.quadraticCurveTo(3,-52,25,-59);c.lineTo(14,-47);c.lineTo(21,-30);c.lineTo(4,-37);c.lineTo(-5,-51);c.lineTo(-22,-53);c.fill();
    // Gun uses the same color and silhouette as its inventory card.
    c.save();c.translate(19-(this.reduceMotion?0:recoil*5),-54);c.rotate(-.04-(this.reduceMotion?0:recoil*(gun==='shotgun'?.11:.045)));
    const color=TYPES[gun].color;
    if(!drawSpecialGun(c,gun)){
    round(c,9,5,12,25,3,'#4d5c47');
    if(gun==='shotgun'){round(c,34,-6,46,7,3,'#455746');round(c,34,2,46,6,2,'#6b7d5d');}
    else if(gun==='smg'){round(c,39,-2,33,10,3,'#455746');round(c,24,11,10,21,2,'#455746');}
    else round(c,38,-2,19,10,2,'#455746');
    round(c,0,-9,45,23,6,color);round(c,5,-9,37,6,3,'#fff0b978');round(c,13,-14,13,5,2,'#52604a');circle(c,31,3,4,'#f4e3ab');
    }
    ellipse(c,7,14,12,8,p.fur);ellipse(c,40,12,10,8,p.fur);
    if(recoil>(gun==='smg'?.3:.6)&&!this.reduceMotion) spark(c,MUZZLE[gun]+3,0,['shotgun','rocket'].includes(gun)?23:gun==='smg'?10:15,gun==='ward'?'#d3ffff':'#ffefab');
    c.restore();c.restore();
  }
}

function round(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function cloud(c,x,y,scale){c.save();c.translate(x,y);c.scale(scale,scale);c.globalAlpha=.48;ellipse(c,0,0,49,12,'#f9ffe9');ellipse(c,-15,-10,22,19,'#f9ffe9');ellipse(c,14,-9,26,22,'#f9ffe9');c.restore();}
function pine(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);round(c,-4,-105,8,112,3,'#77946c');c.fillStyle=color;for(let i=0;i<4;i++){const top=-190+i*33,half=27+i*12;c.beginPath();c.moveTo(0,top);c.quadraticCurveTo(-half*.6,top+38,-half,top+62);c.quadraticCurveTo(0,top+72,half,top+62);c.quadraticCurveTo(half*.6,top+38,0,top);c.fill();}c.restore();}
function bush(c,x,y,s,dark,light){ellipse(c,x,y,s,s*.5,dark);ellipse(c,x-s*.35,y-s*.15,s*.5,s*.5,light);ellipse(c,x+s*.17,y-s*.25,s*.46,s*.53,light);ellipse(c,x+s*.65,y,s*.5,s*.38,dark);}
function grass(c,x,y,s,color){c.strokeStyle=color;c.lineWidth=2.7;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-s*.5,y-s*.4,x-s*.7,y-s*.6);c.moveTo(x,y);c.quadraticCurveTo(x-2,y-s*.7,x+1,y-s);c.moveTo(x,y);c.quadraticCurveTo(x+s*.3,y-s*.5,x+s*.6,y-s*.65);c.stroke();}
function pebble(c,x,y,s){ellipse(c,x,y,s,s*.5,'#b0b391');ellipse(c,x-1,y-2,s*.7,s*.35,'#c5c6a6');}
function mushroom(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);round(c,-3,-15,7,19,3,'#f4e4ba');c.fillStyle='#c28c65';c.beginPath();c.ellipse(0,-15,15,13,0,Math.PI,Math.PI*2);c.closePath();c.fill();circle(c,-5,-20,2.3,'#f6dcb0');circle(c,6,-19,2.8,'#f6dcb0');c.restore();}
function flower(c,x,y,t){grass(c,x,y,10,'#9db173');const fx=x+Math.sin(t*1.2+x)*1.5;for(let i=0;i<5;i++)circle(c,fx+Math.cos(i*1.26)*3.4,y-13+Math.sin(i*1.26)*3.4,3,'#fff8cf');circle(c,fx,y-13,2.3,'#d6ad53');}
function spark(c,x,y,r,color){c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.35:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}
function compact(n){return n>=10000?`${(n/10000).toFixed(1)}万`:String(n);}
