import {stats, TYPES} from './game.mjs';

const CAT_COLORS = [
  {fur:'#edb674', light:'#ffe0a6', stripe:'#d68e52', ears:'#d78d75', scarf:'#65866b'},
  {fur:'#a3b9b3', light:'#d9e4d5', stripe:'#7c9690', ears:'#bc9990', scarf:'#cf9c5b'},
  {fur:'#eee4c6', light:'#fff5dd', stripe:'#c8b991', ears:'#dca294', scarf:'#bf7f68'},
];
export class ForestScene {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.time = 0; this.particles = []; this.recoil = [0,0,0]; this.shake = 0;
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
    if (event.type === 'shot') {
      const p = positions[event.slot]; this.recoil[event.slot] = 1; this.shake = .4;
      this.particles.push({type:'bullet',x:p.x+65*p.scale,y:p.y-73*p.scale,tx:735,ty:g-116-Math.random()*75,life:0,duration:.17,gun:event.gun});
      if (!this.reduceMotion) this.particles.push({type:'number',x:749+(Math.random()-.5)*68,y:g-210-Math.random()*50,text:`−${compact(event.damage)}`,life:0,duration:.85});
    }
    if (event.type === 'kill') {
      this.shake = 1;
      for (let i=0;i<(this.reduceMotion?3:16);i++) {
        this.particles.push({type:i%3?'wood':'leaf',x:750,y:g-100-Math.random()*130,vx:(Math.random()-.5)*260,vy:-100-Math.random()*160,life:0,duration:.7+Math.random()*.45,size:6+Math.random()*9,rotation:Math.random()*6});
      }
      this.particles.push({type:'coins',x:765,y:g-260,text:`+${compact(event.coins)}`,life:0,duration:1.1});
    }
    if (this.particles.length > 160) this.particles.splice(0,this.particles.length-160);
  }
  draw(s, delta, paused) {
    const c = this.ctx, w = this.width, h = this.height, g = h * .785;
    if (!paused) this.time += delta;
    const dt = paused ? 0 : delta, t = this.reduceMotion ? 0 : this.time;
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
    // Target is a friendly woodland tree with carved bark and layered foliage.
    this.tree(760,g+3,s.level,t);
    const cats=stats(s).cats, positions=this.positions();
    for(const i of [2,1,0]) {
      const p=positions[i];
      if(cats[i]) this.cat(p.x,p.y,p.scale,i,cats[i].type,t);
      else this.emptySpot(p.x,p.y,p.scale,i);
    }
    for(const p of this.particles) {
      p.life+=dt;const u=Math.min(1,p.life/p.duration);
      c.save();
      if(p.type==='bullet') {
        const k=Math.min(1,u*1.2),x=p.x+(p.tx-p.x)*k,y=p.y+(p.ty-p.y)*k;
        c.strokeStyle=p.gun==='smg'?'#f8ffb7':'#fff5b5';c.lineWidth=p.gun==='shotgun'?6:4;c.lineCap='round';
        c.beginPath();c.moveTo(x-23,y+5);c.lineTo(x,y);c.stroke();
        circle(c,x,y,3,'#fffceb');
        if(p.gun==='shotgun') {circle(c,x-9,y-9,3,'#ffeca0');circle(c,x-14,y+11,3,'#ffeca0');}
        if(u>.72) spark(c,p.tx,p.ty,15*(1-u)*3,'#fff4b0');
      } else if(p.type==='number'||p.type==='coins') {
        c.globalAlpha=1-u*u;c.font=`800 ${p.type==='coins'?23:20}px "Segoe UI","Microsoft YaHei",sans-serif`;
        c.textAlign='center';c.lineWidth=4;c.strokeStyle=p.type==='coins'?'#fff5d2':'#f8f7dccc';
        c.strokeText(p.text,p.x,p.y-u*50);c.fillStyle=p.type==='coins'?'#ad8644':'#5c7750';c.fillText(p.text,p.x,p.y-u*50);
        if(p.type==='coins') {circle(c,p.x-31,p.y-u*50-8,7,'#e9bd57');circle(c,p.x-31,p.y-u*50-8,4,'#f9db78');}
      } else {
        c.globalAlpha=1-u*u;c.translate(p.x+p.vx*p.life,p.y+p.vy*p.life+220*p.life*p.life);c.rotate(p.rotation+p.life*4);
        if(p.type==='wood') {round(c,-p.size/2,-p.size/3,p.size,p.size*.6,2,'#b78e58');round(c,-p.size/2,-p.size/3,p.size,2,1,'#e4bd7d');}
        else {c.fillStyle='#86a859';c.beginPath();c.ellipse(0,0,p.size,p.size/2,0,0,Math.PI*2);c.fill();}
      }
      c.restore();
    }
    this.particles=this.particles.filter(p=>p.life<p.duration);
    // Foreground leaves give the diorama depth without covering controls.
    bush(c,-24,h+8,100,'#77995d','#9bb56f');bush(c,1036,h+18,121,'#82a15f','#a2b975');
    for(let i=0;i<6;i++) {c.save();c.globalAlpha=.5;circle(c,360+i*98+Math.sin(t*.7+i)*15,200+(i*67)%220+Math.cos(t+i)*10,2.2,'#fffce6');c.restore();}
  }
  tree(x,y,level,t) {
    const c=this.ctx, shake=this.reduceMotion?0:Math.sin(t*75)*this.shake*4;
    c.save();c.translate(x+shake,y);
    ellipse(c,0,3,67,15,'#8a9b6140');
    c.fillStyle='#9d7850';c.beginPath();c.moveTo(-26,-195);c.lineTo(27,-193);c.lineTo(32,-29);c.quadraticCurveTo(47,-7,62,-3);c.quadraticCurveTo(31,8,12,-3);c.quadraticCurveTo(-9,8,-17,-2);c.quadraticCurveTo(-36,8,-52,1);c.lineTo(-30,-28);c.closePath();c.fill();
    c.fillStyle='#bc945d';c.beginPath();c.moveTo(-18,-190);c.lineTo(9,-190);c.lineTo(16,-14);c.quadraticCurveTo(-2,-7,-18,-13);c.fill();
    c.strokeStyle='#8f6e4b';c.lineWidth=4;c.lineCap='round';
    c.beginPath();c.moveTo(9,-116);c.quadraticCurveTo(22,-102,15,-79);c.moveTo(-14,-63);c.lineTo(-15,-33);c.moveTo(-3,-175);c.lineTo(-6,-145);c.stroke();
    c.save();c.rotate(-.17);ellipse(c,-6,-94,9,15,'#957247');ellipse(c,-6,-94,4,9,'#b78d56');c.restore();
    c.strokeStyle='#a48050';c.lineWidth=14;c.beginPath();c.moveTo(-12,-123);c.lineTo(-57,-162);c.moveTo(17,-153);c.lineTo(52,-180);c.stroke();
    const greens=level%9>=6?['#879b5a','#9fac63','#b5bd77','#c1ca83']:['#678c57','#7e9f5e','#91ae6b','#a4bc7a'];
    ellipse(c,5,-186,107,68,greens[0]);
    ellipse(c,-61,-205,62,57,greens[1]);ellipse(c,66,-224,62,55,greens[1]);
    ellipse(c,7,-258,71,64,greens[1]);ellipse(c,-45,-243,58,53,greens[2]);ellipse(c,30,-257,55,52,greens[2]);
    ellipse(c,-15,-282,50,32,greens[3]);ellipse(c,51,-231,45,37,greens[2]);ellipse(c,-66,-215,38,32,greens[2]);
    c.save();c.globalAlpha=.58;
    for(const [a,b,r] of [[-40,-265,12],[19,-275,10],[64,-238,8],[-74,-215,8],[17,-225,11]]) ellipse(c,a,b,r,r*.5,'#bac98a');
    c.restore();
    for(const [a,b] of [[-41,-222],[60,-219],[4,-265]]) {circle(c,a,b,7,'#daa466');circle(c,a-2,b-2,3,'#f0c488');}
    grass(c,-39,4,15,'#89a166');grass(c,33,6,20,'#8caa65');
    c.restore();
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
    c.save();c.translate(x,y);c.scale(scale,scale);
    ellipse(c,3,3,42,11,'#6e7d4c35');c.translate(-recoil*3,bounce);
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
    c.save();c.translate(19-recoil*3,-54);c.rotate(-.04);
    const color=TYPES[gun].color;
    round(c,9,5,12,25,3,'#4d5c47');
    if(gun==='shotgun'){round(c,34,-6,46,7,3,'#455746');round(c,34,2,46,6,2,'#6b7d5d');}
    else if(gun==='smg'){round(c,39,-2,33,10,3,'#455746');round(c,24,11,10,21,2,'#455746');}
    else round(c,38,-2,19,10,2,'#455746');
    round(c,0,-9,45,23,6,color);round(c,5,-9,37,6,3,'#fff0b978');round(c,13,-14,13,5,2,'#52604a');circle(c,31,3,4,'#f4e3ab');
    ellipse(c,7,14,12,8,p.fur);ellipse(c,40,12,10,8,p.fur);
    if(recoil>.6&&!this.reduceMotion) spark(c,gun==='shotgun'?86:gun==='smg'?79:66,0,13,'#ffefab');
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
