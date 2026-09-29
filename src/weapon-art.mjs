const palettes={sniper:['#7887bc','#b1bde2'],crossbow:['#7b9b52','#b9cf87'],rocket:['#d87942','#f6b577'],ward:['#58aebe','#a4e1e4']};
export const MUZZLE={pistol:57,smg:72,shotgun:80,sniper:91,crossbow:76,rocket:70,ward:67};
export function specialWeaponSvg(type,tier){
 if(!palettes[type])return null;
 const [dark,light]=palettes[type];
 const shapes={
 sniper:`<path d="M12 37h19v14H14Z" fill="#47594b"/><rect x="30" y="30" width="43" height="14" rx="3" fill="${dark}"/><path d="M71 33h30v6H71ZM37 43h9l-3 18h-9" fill="#405346"/><rect x="44" y="19" width="27" height="8" rx="3" fill="#46594f"/><circle cx="67" cy="23" r="4" fill="${light}"/><path d="M50 28v-3m13 3v-3" stroke="#455746" stroke-width="3"/>`,
 crossbow:`<path d="M19 40h66" stroke="#725c3e" stroke-width="10"/><path d="M65 12Q97 36 65 61" fill="none" stroke="${dark}" stroke-width="7"/><path d="M65 12 40 37 65 61" fill="none" stroke="#dfd6b3" stroke-width="2"/><path d="M39 37h54m-7-5 10 5-10 5" fill="none" stroke="#344d44" stroke-width="3"/><path d="M32 44 27 59h10l5-15" fill="${dark}"/>`,
 rocket:`<rect x="14" y="26" width="75" height="25" rx="9" fill="${dark}"/><ellipse cx="86" cy="38" rx="10" ry="15" fill="#485849"/><ellipse cx="87" cy="38" rx="6" ry="10" fill="#f9c571"/><path d="M37 50 32 64h13l3-14" fill="#47594b"/><rect x="21" y="27" width="9" height="23" rx="2" fill="${light}"/><path d="M57 32 68 38 57 44Z" fill="${light}"/>`,
 ward:`<rect x="21" y="29" width="53" height="20" rx="9" fill="${dark}"/><path d="M30 46 25 63h13l7-17" fill="#47594b"/><circle cx="70" cy="38" r="15" fill="#477f96"/><circle cx="70" cy="38" r="10" fill="${light}"/><path d="m70 30 6 3v6l-6 5-6-5v-6Z" fill="#fff9d8"/><path d="M42 26v-7h12v7" stroke="${dark}" stroke-width="4" fill="none"/>`,
 };
 return `<svg viewBox="0 0 108 78" aria-hidden="true" class="weapon-art"><ellipse cx="54" cy="68" rx="37" ry="4" fill="#29483d" opacity=".08"/><g transform="rotate(-8 54 38)">${shapes[type]}${tier>0?'<path d="m91 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e8b850"/>':''}</g></svg>`;
}
const rect=(c,x,y,w,h,r,color)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
const orb=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
export function drawSpecialGun(c,type){
 if(!palettes[type])return false;
 const [dark,light]=palettes[type];rect(c,8,8,13,24,3,'#47594b');
 if(type==='sniper'){
  rect(c,-9,-3,20,18,3,'#47594b');rect(c,6,-8,43,20,4,dark);rect(c,43,-3,48,7,2,'#405346');rect(c,17,-21,32,9,3,'#46594f');orb(c,44,-16,3,light);
 }else if(type==='crossbow'){
  rect(c,0,-2,61,7,3,'#725c3e');c.lineWidth=6;c.strokeStyle=dark;c.beginPath();c.moveTo(45,-26);c.quadraticCurveTo(78,1,45,28);c.stroke();c.lineWidth=2;c.strokeStyle='#e5dbb4';c.beginPath();c.moveTo(45,-26);c.lineTo(18,1);c.lineTo(45,28);c.stroke();c.strokeStyle='#3b5146';c.beginPath();c.moveTo(20,1);c.lineTo(76,1);c.stroke();
 }else if(type==='rocket'){
  rect(c,-8,-12,71,29,10,dark);rect(c,1,-12,9,29,2,light);rect(c,58,-16,12,36,5,'#46594a');rect(c,61,-9,6,22,3,'#f6b577');
 }else{
  rect(c,0,-9,47,22,8,dark);orb(c,50,2,17,'#477f96');orb(c,50,2,11,light);c.strokeStyle='#fff9d8';c.lineWidth=3;c.beginPath();c.moveTo(43,-3);c.lineTo(50,-7);c.lineTo(57,-3);c.lineTo(55,6);c.lineTo(50,10);c.lineTo(45,6);c.closePath();c.stroke();
 }
 return true;
}
export function drawSpecialProjectile(c,p,u,reduceMotion){
 if(!palettes[p.gun])return false;
 const [dark,light]=palettes[p.gun],x=p.x+(p.tx-p.x)*u,y=p.y+(p.ty-p.y)*u;
 c.strokeStyle=light;c.lineWidth=3;c.lineCap='round';
 if(p.gun==='sniper'){
  c.globalAlpha=reduceMotion?.65:.9;c.beginPath();c.moveTo(reduceMotion?x-25:p.x,reduceMotion?y:p.y);c.lineTo(x,y);c.stroke();orb(c,x,y,4,'#f7f3ff');
 }else if(p.gun==='crossbow'){
  c.save();c.translate(x,y);c.rotate(Math.atan2(p.ty-p.y,p.tx-p.x));c.strokeStyle='#55713d';c.beginPath();c.moveTo(-31,0);c.lineTo(7,0);c.moveTo(0,-5);c.lineTo(7,0);c.lineTo(0,5);c.moveTo(-23,-5);c.lineTo(-17,0);c.lineTo(-23,5);c.stroke();c.restore();
 }else if(p.gun==='rocket'){
  c.save();c.translate(x,y);c.rotate(Math.atan2(p.ty-p.y,p.tx-p.x));if(!reduceMotion){orb(c,-21,0,8,'#f5c36c');orb(c,-32,0,5,'#f2d59788');}rect(c,-18,-6,23,12,5,dark);orb(c,3,0,5,light);c.restore();
 }else{
  orb(c,x,y,8,'#a4e1e466');orb(c,x,y,4,'#e8ffff');c.beginPath();c.arc(x,y,11,0,Math.PI*2);c.stroke();
 }
 return true;
}
