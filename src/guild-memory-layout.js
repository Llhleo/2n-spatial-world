// Stable identities travel through three open silhouettes. No random replacement.
export function createMemoryLayout({mobile=true,assets=[],seed=260206}={}){
 const usable=assets.filter(a=>a.key&&Number.isFinite(a.radius)&&a.radius>0);
 const anchors=[],perBranch=mobile?28:42;
 const shots=[{position:[0,3,100],target:[0,0,-14]},{position:[12,-9,93],target:[0,-4,-28]},{position:[0,8,125],target:[0,0,-30]}];
 for(let branch=0;branch<3&&usable.length;branch++)for(let slot=0;slot<perBranch;slot++){
  const u=slot/(perBranch-1),angle=-.30+u*Math.PI*1.65,r=18+branch*10;
  const positions=[
   [Math.cos(angle)*r,Math.sin(angle)*r+8,-u*72-branch*16],
   [(u-.5)*94,Math.cos(u*Math.PI*2)*17-7+branch*9,-u*90-branch*22],
   [Math.cos(angle+.4*branch)*r,Math.sin(angle+.4*branch)*r*.78,-u*100-branch*24]
  ];
  const asset=usable[(slot+branch*7+seed)%usable.length],radius=asset.radius;
  if(anchors.some(p=>positions.some((v,stage)=>Math.hypot(...v.map((x,k)=>x-p.positions[stage][k]))<radius+p.radius+.5)))continue;
  anchors.push({id:`memory-${branch}-${slot}`,key:asset.key,positions,radius,branch,u,twist:((slot*17+branch*5+seed)%21-10)*.013});
 }
 return {anchors,shots,bounds:{radius:Math.max(1,...anchors.map(a=>Math.max(...a.positions.map(p=>Math.hypot(...p)+a.radius))))}};
}
