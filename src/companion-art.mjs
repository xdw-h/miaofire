export function petPortrait(id){
  const art={
    squirrel:'<path d="M34 66C7 62 8 26 26 27c18 1 19 22 7 25" fill="#bc8356"/><path d="M28 34c-12 1-9 20 0 24" fill="none" stroke="#e6b684" stroke-width="5"/><ellipse cx="55" cy="68" rx="21" ry="19" fill="#d9a268"/><ellipse cx="60" cy="70" rx="13" ry="14" fill="#f9dfab"/><path d="m39 41 0-19 14 12m12 1 13-13v24" fill="#d9a268"/><ellipse cx="58" cy="46" rx="26" ry="20" fill="#dfad78"/><ellipse cx="63" cy="53" rx="18" ry="10" fill="#fae3b7"/><circle cx="49" cy="44" r="3" fill="#493e32"/><circle cx="69" cy="44" r="3" fill="#493e32"/><path d="m58 51 8 0-4 5Z" fill="#866345"/><ellipse cx="63" cy="73" rx="8" ry="10" fill="#ac8151"/><path d="M53 68q10-13 20 0" fill="#745d3c"/>',
    bird:'<path d="m28 68-15-6 12-12" fill="#579389"/><ellipse cx="50" cy="57" rx="28" ry="26" fill="#7bb6a6"/><ellipse cx="57" cy="62" rx="18" ry="20" fill="#e6ecc0"/><path d="M33 59q-10-22-13-15-1 28 24 25" fill="#4c9186"/><path d="m42 34 5-17 7 14 9-13 0 19" fill="#70a793"/><circle cx="59" cy="44" r="5" fill="#faffdc"/><circle cx="60" cy="45" r="2.5" fill="#334b40"/><path d="m73 49 14 6-14 6Z" fill="#dba34e"/><path d="m44 80-1 7m16-7 1 7" stroke="#bd8e50" stroke-width="4" stroke-linecap="round"/>',
    raccoon:'<path d="M29 72C2 73 7 51 24 53" fill="none" stroke="#9a9887" stroke-width="15"/><path d="m15 67 5-12m5 18 5-12" stroke="#656e61" stroke-width="7"/><ellipse cx="55" cy="68" rx="23" ry="18" fill="#a5a795"/><ellipse cx="61" cy="68" rx="14" ry="15" fill="#e3dfc6"/><circle cx="35" cy="30" r="10" fill="#8c9381"/><circle cx="75" cy="30" r="10" fill="#8c9381"/><circle cx="35" cy="30" r="5" fill="#dbc0ac"/><circle cx="75" cy="30" r="5" fill="#dbc0ac"/><ellipse cx="55" cy="46" rx="28" ry="23" fill="#b3b4a0"/><path d="M29 43q8-13 23 0h7q15-13 23 0-7 20-25 8h-3q-18 9-25-8" fill="#626e60"/><circle cx="43" cy="43" r="3" fill="#fff8d5"/><circle cx="67" cy="43" r="3" fill="#fff8d5"/><ellipse cx="55" cy="55" rx="12" ry="8" fill="#eee7cd"/><path d="m50 50 10 0-5 6Z" fill="#4a5146"/><circle cx="62" cy="75" r="10" fill="#ddbc66"/><circle cx="62" cy="75" r="6" fill="none" stroke="#f8e4a1" stroke-width="2"/>',
  };
  return `<svg class="pet-portrait" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="51" cy="88" rx="30" ry="5" fill="#315340" opacity=".08"/>${art[id]||''}</svg>`;
}
// Shared companion silhouettes are drawn without network assets.
export function drawCompanion(c,id,x,y,t,reduceMotion){
  if(!id)return;
  c.save();c.translate(x,y+(reduceMotion?0:Math.sin(t*3)*2));c.scale(.75,.75);
  const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const line=(x1,y1,x2,y2,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  ellipse(0,3,28,7,'#536b4230');
  if(id==='bird'){
    ellipse(-4,-29,24,25,'#77b2a0');ellipse(4,-24,15,17,'#e6ebbf');
    ellipse(-19,-31,15,8,'#509489');line(-4,-53,0,-65,'#73a48d',6);line(2,-53,12,-62,'#73a48d',5);
    c.fillStyle='#d8a456';c.beginPath();c.moveTo(18,-36);c.lineTo(34,-30);c.lineTo(18,-25);c.fill();
    ellipse(8,-39,3,4,'#314d40');line(-6,-4,-7,2,'#b88c52',4);line(8,-4,10,2,'#b88c52',4);
  }else{
    const sq=id==='squirrel',fur=sq?'#d7a06a':'#a9aa96';
    if(sq){ellipse(-25,-31,13,25,'#bf8658');ellipse(-28,-40,8,14,'#e4b17f');}
    else {line(-15,-11,-38,-14,'#8e9584',12);line(-29,-13,-28,-19,'#5f6e5d',6);}
    ellipse(0,-16,21,21,fur);ellipse(7,-12,12,14,sq?'#fae1b1':'#e3dfc4');
    ellipse(-12,-52,7,11,fur);ellipse(18,-52,7,11,fur);ellipse(3,-36,25,20,fur);
    if(!sq){ellipse(-7,-38,10,7,'#63715d');ellipse(15,-38,10,7,'#63715d');}
    ellipse(-6,-38,2.5,3,sq?'#4c4937':'#fff7d8');ellipse(15,-38,2.5,3,sq?'#4c4937':'#fff7d8');
    ellipse(6,-28,10,6,sq?'#fae1b1':'#e5dfc9');ellipse(6,-30,3,2.5,'#6f6250');
    ellipse(-9,1,9,4,'#788063');ellipse(13,1,9,4,'#788063');
  }
  c.restore();
}
