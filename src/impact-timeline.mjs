export class ImpactTimeline {
 constructor(){this.queue=[];this.targetId=null;}
 add(event){
  if(!['shot','kill'].includes(event.type))return;
  if(this.targetId===null)this.targetId=event.targetId;
  this.queue.push({...event,delay:.15});
  if(this.queue.length>160)this.queue.splice(0,this.queue.length-160);
 }
 tick(delta){
  const due=[];
  for(const e of this.queue){
   e.delay-=delta;
   if(e.delay>1e-8)continue;
   if(e.targetId!==this.targetId)continue;
   due.push(e);
   if(e.type==='kill')this.targetId=e.nextTargetId;
  }
  this.queue=this.queue.filter(e=>e.delay>1e-8);
  return due;
 }
 clear(){this.queue=[];this.targetId=null;}
}
