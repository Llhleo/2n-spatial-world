// The same identities follow open, volumetric ribbons around a clear reading space.
const lerp=(a,b,t)=>a+(b-a)*t;
export function memoryPoint(a,phase=0){
 const i=Math.min(1,Math.floor(Math.max(0,phase))),t=Math.max(0,Math.min(1,phase-i));
 const p=a.orbits[i],q=a.orbits[i+1];
 const angle=lerp(p.angle,q.angle,t),depth=lerp(p.depth,q.depth,t);
 // Perspective compensation keeps front and rear ribbons framing the text.
 const perspective=(114-depth)/114;
 return [Math.cos(angle)*lerp(p.rx,q.rx,t)*perspective,Math.sin(angle)*lerp(p.ry,q.ry,t)*perspective,depth-14];
}
export function createMemoryLayout({mobile=true,assets=[],seed=260206}={}){
 const usable=assets.filter(a=>a.key&&Number.isFinite(a.radius)&&a.radius>0);
 const anchors=[],perBranch=mobile?28:42;
 const shots=[{position:[0,3,100],target:[0,0,-14]},{position:[6,-4,100],target:[0,0,-14]},{position:[-4,7,108],target:[0,0,-14]}];
 for(let branch=0;branch<3&&usable.length;branch++)for(let slot=0;slot<perBranch;slot++){
  const u=slot/(perBranch-1),angle=-.3+u*Math.PI*1.78+branch*.23;
  const orbits=[
   {angle,rx:23+branch*4,ry:36+branch*6,depth:Math.sin(angle*1.6+branch)*30+(branch-1)*18},
   {angle:angle+.8,rx:27+branch*4,ry:33+branch*7,depth:Math.sin(angle*1.6+branch+.7)*34+(branch-1)*20},
   {angle:angle+1.5,rx:24+branch*5,ry:39+branch*5,depth:Math.sin(angle*1.6+branch+1.3)*32+(branch-1)*22}
  ];
  const asset=usable[(slot+branch*7+seed)%usable.length],radius=asset.radius;
  const a={id:`memory-${branch}-${slot}`,key:asset.key,orbits,radius,branch,u,twist:((slot*17+branch*5+seed)%21-10)*.013};
  a.positions=[0,1,2].map(p=>memoryPoint(a,p));
  if(anchors.some(p=>Array.from({length:41},(_,i)=>i/20).some(phase=>{const v=memoryPoint(a,phase),q=memoryPoint(p,phase);return Math.hypot(...v.map((x,k)=>x-q[k]))<radius+p.radius+.7;})))continue;
  anchors.push(a);
 }
 return {anchors,shots,bounds:{radius:Math.max(1,...anchors.map(a=>Math.max(...a.positions.map(p=>Math.hypot(...p)+a.radius))))}};
}
export function sampleMemoryStory(t=0){
 const seconds=Math.max(0,Math.min(1,t))*36;
 const smooth=v=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
 const phase=smooth((seconds-12)/3)+smooth((seconds-24)/3);
 const eventIndex=seconds<13.5?0:seconds<25.5?1:2;
 const start=[0,15,27][eventIndex],end=[12,24,36][eventIndex];
 const eventOpacity=smooth((seconds-start)/.8)*(eventIndex===2?1:1-smooth((seconds-end+1)/1));
 return {memoryPhase:phase,eventIndex,eventOpacity,target:[0,0,-14]};
}
