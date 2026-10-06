import {LEGACY_TOTAL_UNITS} from './people-story.js';
import {HISTORY_UNITS,HISTORY_SECONDS} from './guild-history-route.js';
const start=LEGACY_TOTAL_UNITS/28,end=start+HISTORY_UNITS/28*7/HISTORY_SECONDS;
// Rendered manual progress follows input, but cannot skip the departure corridor.
// The physical scroll target is retained; autoplay never calls this limiter.
export function limitManualHistoryEntry(current,candidate,dt,reduced=false){
 if(reduced||current===candidate)return candidate;
 const step=(end-start)*Math.max(0,Math.min(.05,dt))/2.4;
 if(candidate>current&&current<end&&candidate>start)return Math.min(candidate,Math.max(start,current)+step);
 if(candidate<current&&current>start&&candidate<end)return Math.max(candidate,Math.min(end,current)-step);
 return candidate;
}
