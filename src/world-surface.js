const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Garden formula is unchanged. Desert continues into Ocean without a basin
// or an artificial dark edge between biomes.
export function worldHeight(x,z){
 const dune=smooth(x,238,365),ridge=Math.sin(x*.021+Math.sin(z*.028)*1.7)*4.8+Math.cos(z*.033+x*.008)*3.4;
 const close=Math.sin(x*.073+z*.045)*1.05+Math.cos(z*.088-x*.052)*.7,long=Math.sin(z*.014+x*.012)*3.6;
 const sea=smooth(x,500,660),land=49+ridge+close+dune*long;
 const seabed=43+Math.sin(x*.028+z*.013)*2.1+Math.cos(z*.043-x*.012)*1.3;
 const edge=smooth(x,42,77)*(1-smooth(x,850,930))*smooth(z,-350,-290)*(1-smooth(z,250,320));
 return -85+edge*(land*(1-sea)+seabed*sea);
}
