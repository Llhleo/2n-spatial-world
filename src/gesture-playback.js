// Gestures choose direction; wall-clock time alone advances the displayed frame.
export function createGesturePlayback(stops){
 if(!Array.isArray(stops)||stops.length<2||stops.some((v,i)=>!Number.isFinite(v)||(i&&v<=stops[i-1])))throw new Error('Playback stops must be strictly increasing.');
 let time=stops[0],target=time,direction=0;
 function seek(value){time=Math.max(stops[0],Math.min(stops.at(-1),Number.isFinite(value)?value:stops[0]));target=time;direction=0;return time;}
 function request(value){
  const next=Math.sign(value);if(!next)return;
  // Repeated momentum events do not queue another segment or enlarge a target.
  if(direction===next&&Math.abs(target-time)>1e-8)return;
  direction=next;
  target=next>0?(stops.find(v=>v>time+1e-7)??stops.at(-1)):([...stops].reverse().find(v=>v<time-1e-7)??stops[0]);
 }
 function advance(dt){
  const step=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0)),difference=target-time;
  if(Math.abs(difference)<=step){time=target;direction=0;}else time+=Math.sign(difference)*step;
  return time;
 }
 return {request,advance,seek,get time(){return time;},get target(){return target;},get playing(){return Math.abs(target-time)>1e-8;},get direction(){return direction;}};
}
