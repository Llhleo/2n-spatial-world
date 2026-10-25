export const PETAL_NAMES=['rose','starfish','iris','clover','cactus','goldenleaf','peas','tomato','compass','shell','corruption','darkmark','sand','pearl'];
const mod=(v,n)=>((v%n)+n)%n;
export function createTraffic({length,previousCount,width,seed=1}){
 let state=seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const visibleCountPerLane=previousCount*3;
 // Wrap far behind the authored road, beyond the renderer's far plane.
 const margin=3600,period=length+margin*2,count=Math.ceil(visibleCountPerLane*period/(1.7*length));
 const mean=period/count,lanes=[];
 for(let lane=0;lane<2;lane++){
  const weights=Array.from({length:count},()=>.78+random()*.44),sum=weights.reduce((a,b)=>a+b,0);
  const records=[];let s=mean*.5;
  for(let i=0;i<count;i++){
   // A shuffled balanced cycle avoids neighboring repeated shells or pearls.
   const name=PETAL_NAMES[(i*5+lane*3+seed)%PETAL_NAMES.length];
   const size=Math.min(1.35+random()*.95,width*.18,(mean*.76-.5)/2);
   records.push({s:s-margin,size,name,lane,phase:random()*Math.PI*2});
   s+=weights[i]/sum*period;
  }
  lanes.push(records);
 }
 return {lanes,period,margin,length,visibleCountPerLane,speed:2.8};
}
export function trafficCoordinate(p,time,traffic){return mod(p.s+traffic.margin+time*traffic.speed*(p.lane===0?1:-1),traffic.period)-traffic.margin;}
