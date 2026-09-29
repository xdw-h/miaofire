const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const box=(c,x,y,w,h,r,color)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
function leaf(c,x,y,angle,size,color){c.save();c.translate(x,y);c.rotate(angle);ellipse(c,0,0,size,size*.42,color);c.restore();}
function face(c,y,wide=1){
 ellipse(c,-22*wide,y,6,9,'#3e5543');ellipse(c,22*wide,y,6,9,'#3e5543');
 ellipse(c,-20*wide,y-3,2,3,'#fff9d9');ellipse(c,24*wide,y-3,2,3,'#fff9d9');
 ellipse(c,-33*wide,y+17,11,5,'#d6937970');ellipse(c,33*wide,y+17,11,5,'#d6937970');
 c.strokeStyle='#52734a';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(-9,y+19);c.quadraticCurveTo(0,y+26,9,y+19);c.stroke();
}
export function drawEnemy(c,enemy,x,y,time,shake=0,reduce=false,attackView=null){
 c.save();c.translate(x+(reduce?0:Math.sin(time*75)*shake*4),y);
 ellipse(c,0,3,enemy.kind==='boss'?95:69,15,'#6c805b35');
 const bounce=reduce?0:Math.sin(time*(enemy.kind==='boss'?1.8:3.5))*3;
 c.translate(0,bounce);
 const load=reduce?0:attackView?.windup??0,release=reduce||attackView?.phase!=='flight'?0:Math.sin(Math.PI*Math.min(1,attackView.progress*2));
 if(enemy.kind==='slime'){c.scale(1+load*.14-release*.07,1-load*.16+release*.08);c.translate(-release*12,0);}
 if(enemy.kind==='mushroom'){c.rotate(load*.045-release*.06);c.translate(0,load*8-release*7);}
 if(enemy.kind==='armored'){c.rotate(load*.07-release*.1);c.translate(-release*15,load*5);}
 if(enemy.kind==='slime'){
  ellipse(c,-41,-8,27,12,'#77a47d');ellipse(c,39,-8,27,12,'#77a47d');
  c.fillStyle='#83b99b';c.beginPath();c.moveTo(-78,-34);c.bezierCurveTo(-89,-109,-49,-179,7,-182);c.bezierCurveTo(77,-180,89,-92,78,-34);c.quadraticCurveTo(4,9,-78,-34);c.fill();
  ellipse(c,3,-77,63,64,'#9fcdb0');ellipse(c,-25,-130,18,9,'#d5edc6');
  leaf(c,-7,-188,-.65,27,'#7da06a');leaf(c,18,-192,.65,23,'#aac17b');
  face(c,-90);ellipse(c,-60,-51,9,17,'#83b99b');ellipse(c,64,-51,9,17,'#83b99b');
 }else if(enemy.kind==='mushroom'){
  ellipse(c,-29,-4,22,11,'#a78c70');ellipse(c,29,-4,22,11,'#a78c70');
  box(c,-47,-131,94,126,35,'#e8d6a6');ellipse(c,0,-60,41,49,'#f5e7be');
  ellipse(c,-53,-68,16,13,'#ead8ad');ellipse(c,54,-68,16,13,'#ead8ad');
  c.fillStyle='#c57e63';c.beginPath();c.moveTo(-96,-129);c.bezierCurveTo(-99,-215,-28,-239,1,-237);c.bezierCurveTo(78,-237,100,-157,96,-129);c.quadraticCurveTo(0,-97,-96,-129);c.fill();
  ellipse(c,0,-132,98+load*6,19,'#a46851');ellipse(c,0,-139,96+load*6,15,'#e5b68b');
  ellipse(c,-39,-190,19,12,'#f2dcb1');ellipse(c,27,-214,14,9,'#f2dcb1');ellipse(c,59,-169,15,12,'#f2dcb1');
  face(c,-73,.84);
 }else if(enemy.kind==='armored'){
  for(const dir of [-1,1])for(let i=0;i<3;i++){c.strokeStyle='#877459';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(dir*45,-35-i*31);c.lineTo(dir*86,-17-i*25);c.stroke();}
  ellipse(c,0,-94,75,98,'#9c805b');ellipse(c,0,-104,65,79,'#c0a36e');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(c,-49+col*33,-168+row*35,30,31,9,(row+col)%2?'#b59a66':'#cfb784');
  c.strokeStyle='#8c7957';c.lineWidth=4;c.beginPath();c.moveTo(0,-178);c.lineTo(0,-59);c.stroke();
  ellipse(c,0,-33,44,31,'#c4b48a');face(c,-37,.7);
  leaf(c,-21,-196,-.8,20,'#879867');leaf(c,15,-201,.65,21,'#a3af76');
 }else if(enemy.kind==='boss'){
  // Root boots, bark fists and a broad canopy make the guardian distinct at phone size.
  box(c,-59,-39,42,41,13,'#92754f');box(c,18,-39,42,41,13,'#92754f');
  c.strokeStyle='#8f714e';c.lineWidth=32;c.lineCap='round';
  const lift=load*48-release*65;
  c.beginPath();c.moveTo(-43,-154);c.lineTo(-100,-100-lift*.5);c.lineTo(-116,-143-lift);c.moveTo(43,-154);c.lineTo(100,-108-lift*.5);c.lineTo(112,-153-lift);c.stroke();
  ellipse(c,-117,-151-lift,28,32,'#ba915d');ellipse(c,112,-161-lift,28,32,'#ba915d');
  box(c,-62,-224,124,204,26,'#98764e');box(c,-48,-219,97,190,23,'#be975e');box(c,-15,-205,27,167,12,'#cfaa71');
  c.strokeStyle='#8b6d48';c.lineWidth=4;c.beginPath();c.moveTo(-35,-113);c.lineTo(-40,-51);c.moveTo(32,-187);c.lineTo(38,-153);c.moveTo(24,-86);c.lineTo(20,-42);c.stroke();
  for(const [xx,yy,rr,color] of [[-72,-220,59,'#72945c'],[66,-227,62,'#72945c'],[-33,-267,64,'#90aa68'],[39,-267,66,'#99b372'],[0,-305,51,'#b4c481']])ellipse(c,xx,yy,rr,rr*.77,color);
  for(const [xx,yy]of [[-73,-238],[59,-266],[13,-294]])ellipse(c,xx,yy,9,11,'#d9af65');
  // Amber eyes and chevron brows communicate a tough but non-frightening opponent.
  ellipse(c,-25,-166,13,16,'#65593f');ellipse(c,25,-166,13,16,'#65593f');
  const eyeColor=attackView?.enraged?'#f19a63':'#ffe3a1';
  ellipse(c,-25,-165,6,10,eyeColor);ellipse(c,25,-165,6,10,eyeColor);
  c.strokeStyle='#775c40';c.lineWidth=7;c.beginPath();c.moveTo(-42,-190);c.lineTo(-13,-182);c.moveTo(13,-182);c.lineTo(42,-190);c.moveTo(-19,-133);c.lineTo(19,-133);c.stroke();
  leaf(c,-52,-54,-.6,21,'#87a167');leaf(c,56,-70,.7,19,'#87a167');
  c.fillStyle='#dbb366';c.beginPath();c.moveTo(-29,-331);c.lineTo(-36,-357);c.lineTo(-12,-344);c.lineTo(0,-365);c.lineTo(12,-344);c.lineTo(36,-357);c.lineTo(29,-331);c.closePath();c.fill();
  ellipse(c,0,-342,5,6,'#a37647');
 }
 c.restore();
}
