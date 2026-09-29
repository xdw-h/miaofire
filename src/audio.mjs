// All sound starts from an explicit user gesture. No downloaded audio is needed.
const MELODY=[72,76,79,76,74,72,69,null,69,72,76,72,67,69,72,null,74,77,81,77,76,74,71,null,67,71,74,71,72,null,67,null];
const BASS=[48,45,53,43];
const frequency=note=>440*2**((note-69)/12);
export class GameAudio{
 constructor(createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),onChange=()=>{}){
  this.createContext=createContext;this.onChange=onChange;this.enabled=false;this.status='off';this.volume=.6;this.paused=false;
  this.context=null;this.master=null;this.voices=new Map();this.epoch=0;this.beat=0;this.nextNote=0;this.lastShot=-Infinity;
 }
 update(status){this.status=status;this.onChange();}
 async enable(){
  const epoch=++this.epoch;this.update('starting');let timer;
  try{
   if(!this.context||this.context.state==='closed'){
    this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
    this.context.onstatechange=()=>{
     if(this.enabled&&!this.paused&&this.context.state!=='running')this.block();
    };
   }
   if(this.context.state!=='running')await Promise.race([this.context.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Audio start timed out')),4000);})]);
   if(epoch!==this.epoch)return false;
   if(this.context.state!=='running')throw Error('Audio is not running');
   this.enabled=true;this.master.gain.value=this.paused?0:this.volume;this.nextNote=this.context.currentTime+.05;this.beat=0;this.lastShot=-Infinity;
   this.update(this.paused?'paused':'playing');this.play('test');return true;
  }catch{
   if(epoch===this.epoch)this.block();return false;
  }finally{clearTimeout(timer);}
 }
 block(){this.enabled=false;this.stopVoices();if(this.master)this.master.gain.value=0;this.update('blocked');}
 disable(){++this.epoch;this.enabled=false;this.stopVoices();if(this.master)this.master.gain.value=0;this.update('off');}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.min(1,Math.max(0,value));if(this.master)this.master.gain.value=this.enabled&&!this.paused?this.volume:0;this.onChange();}
 setPaused(paused){
  if(this.paused===paused)return;this.paused=paused;
  if(paused){this.stopVoices();if(this.master)this.master.gain.value=0;if(this.enabled)this.update('paused');}
  else if(this.enabled){
   if(this.context.state!=='running'){this.block();return;}
   this.master.gain.value=this.volume;this.nextNote=this.context.currentTime+.05;this.update('playing');
  }
 }
 stopVoices(){for(const [o,g]of this.voices){try{o.stop();}catch{}o.disconnect();g.disconnect();}this.voices.clear();}
 tone(pitch,time,duration,gain,type='sine',endPitch=pitch){
  const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;
  o.frequency.setValueAtTime(pitch,time);o.frequency.exponentialRampToValueAtTime(endPitch,time+duration*.7);
  g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(gain,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  o.connect(g);g.connect(this.master);this.voices.set(o,g);
  o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};o.start(time);o.stop(time+duration+.02);
 }
 play(kind,gun='pistol'){
  if(!this.enabled||this.paused||this.context.state!=='running')return;
  const t=this.context.currentTime;
  if(kind==='shot'&&t-this.lastShot<(gun==='smg'?.065:.095))return;
  try{
   if(kind==='test'){for(const [i,n]of [72,76,79].entries())this.tone(frequency(n),t+i*.18,.25,.16,'triangle');return;}
   if(kind==='shot')this.lastShot=t;
   const pitch=({shotgun:150,smg:340,sniper:240,crossbow:520,rocket:120,ward:680})[gun]??280;
   const start=kind==='hurt'?220:kind==='shot'?pitch:kind==='kill'?700:520;
   this.tone(start,t,kind==='shot'?.16:.22,kind==='shot'?(gun==='smg'?.075:.13):.12,kind==='shot'?'triangle':'sine',kind==='shot'?pitch*.4:kind==='hurt'?90:880);
  }catch{this.block();}
 }
 tick(){
  if(!this.enabled||this.paused||this.context.state!=='running')return;
  const now=this.context.currentTime;if(this.nextNote<now-.2)this.nextNote=now+.03;
  try{
   while(this.nextNote<now+.15){
    const note=MELODY[this.beat%MELODY.length];
    if(note!==null)this.tone(frequency(note),this.nextNote,.36,.085,'triangle');
    if(this.beat%8===0)this.tone(frequency(BASS[Math.floor(this.beat/8)%4]),this.nextNote,1.15,.11);
    this.beat++;this.nextNote+=.42;
   }
  }catch{this.block();}
 }
}
