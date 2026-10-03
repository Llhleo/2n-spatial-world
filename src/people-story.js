import {STORY_UNITS,RETURN_START,RETURN_UNITS,lookbackPose} from './lookback.js';
import {PEOPLE_UNITS,peoplePose} from './people-path.js';
import {pose} from './journey.js';
import {gardenPose} from './garden-path.js';
import {oceanPose} from './ocean-production.js';
import {junglePose} from './jungle-production.js';
import {hellPose} from './hell-production.js';

export const TOTAL_UNITS=STORY_UNITS+PEOPLE_UNITS;
export const AUTOPLAY_DURATION=150*TOTAL_UNITS/STORY_UNITS;
const clamp=t=>Math.max(0,Math.min(1,t));
// Keep the historical absolute coordinate: one progress unit is 28 scroll units.
export const scrollToStory=t=>clamp(t)*TOTAL_UNITS/28;
export const storyToScroll=p=>clamp(p*28/TOTAL_UNITS);

export function chapterAt(progress){
 const p=Math.max(0,Math.min(TOTAL_UNITS/28,progress));
 // A normalized scroll round-trip can put the old endpoint a few ulps ahead.
 const inPeople=p*28>STORY_UNITS+1e-9;
 const peopleT=inPeople?clamp((p*28-STORY_UNITS)/PEOPLE_UNITS):0;
 const returnT=clamp((p-RETURN_START)/(RETURN_UNITS/28));
 const heroT=clamp(p/(6/28)),worldT=clamp((p-6/28)/(8/28));
 const chapter=inPeople?'people':p>=RETURN_START?'lookback':p<=6/28?'hero':p<=14/28?'garden':p<=20/28?'ocean':p<=24/28?'jungle':'hell';
 return {chapter,peopleT,returnT,heroT,worldT};
}

/** Absolute sampling on the existing camera; no readiness or viewport history. */
export function sampleStoryPose(progress,camera,portrait){
 const {chapter,peopleT,returnT,heroT,worldT}=chapterAt(progress);
 if(chapter==='people')return peoplePose(peopleT,camera,camera.aspect);
 if(chapter==='lookback')return lookbackPose(returnT,camera);
 if(chapter==='hero')return pose(heroT,camera,portrait);
 if(chapter==='garden')return gardenPose(worldT,camera,portrait);
 if(chapter==='ocean')return oceanPose((progress-14/28)/(6/28),camera,portrait);
 if(chapter==='jungle')return junglePose((progress-20/28)/(4/28),camera);
 return hellPose((progress-24/28)/(4/28),camera);
}
