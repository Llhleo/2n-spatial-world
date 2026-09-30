// One-shot, bounded experiment. Failures never create an indefinite input lock.
export function createLoadingIntro(start,enabled=true){
 let released=!enabled;
 return {skip(){released=true;},update({now,gardenReady,failed,reduced}){if(gardenReady||failed||reduced||now-start>=15000)released=true;return {locked:!released,speed:released?1:.4};}};
}
export function attachIntroInput(target,isLocked,onSkip){
 const block=event=>{if(!isLocked()||event.target.closest?.('#loading-status'))return;if(event.type==='touchmove'&&event.touches.length>1)return;event.preventDefault();};
 target.addEventListener('touchmove',block,{passive:false});target.addEventListener('wheel',block,{passive:false});
 target.addEventListener('keydown',event=>{if(event.key==='Escape'){onSkip();return;}if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))block(event);});
}
