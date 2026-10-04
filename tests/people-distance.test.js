import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard} from '../src/people-courtyard.js';
import {scrollToStory,storyToScroll,autoplayToScroll,scrollToAutoplay,autoplayDuration,chapterAt,TOTAL_UNITS} from '../src/people-story.js';
import {STORY_UNITS} from '../src/lookback.js';
const fixture={leaders:[{id:'one',name:'one'}],members:Array.from({length:95},(_,i)=>`person ${i}`)};
const base=createPeopleRoute(fixture);
const scrollAt=(route,t)=>storyToScroll((STORY_UNITS+18*t)/28,route);
for(const route of [base,resizeCourtyard(base,{width:240,height:568})])test(`manual distance gives transfers proportional travel space (${route.stations.length} windows)`,()=>{
 const a=route.windows[2],b=route.windows[3];
 const read=scrollAt(route,a.readEnd)-scrollAt(route,a.readStart),transfer=scrollAt(route,b.readStart)-scrollAt(route,a.readEnd);
 assert.ok(transfer>read*15,`long transfer ${transfer} still squeezed below reading ${read}`);
 for(let i=0;i<=2000;i++){
  const s=i/2000,p=scrollToStory(s,route);assert.ok(Math.abs(storyToScroll(p,route)-s)<1e-11);
  const autoplay=scrollToAutoplay(s,route);assert.ok(Math.abs(autoplayToScroll(autoplay,route)-s)<1e-11);
 }
 // Constant manual increments must not retain the old hold/transfer speed cliff.
 const steps=[];const lo=scrollAt(route,a.readStart+.001),hi=scrollAt(route,b.readEnd-.001),delta=(hi-lo)/3000;
 for(let s=lo;s<=hi;s+=delta){const t=chapterAt(scrollToStory(s,route)).peopleT,u=chapterAt(scrollToStory(s+1e-8,route)).peopleT;steps.push(new T.Vector3(...sampleCourtyard(route,t).position).distanceTo(new T.Vector3(...sampleCourtyard(route,u).position)));}
 assert.ok(Math.max(...steps)/Math.min(...steps)<2,'manual local speed retains transfer cliff');
 const old=STORY_UNITS/TOTAL_UNITS;
 for(let i=0;i<=100;i++){const s=old*i/100;assert.ok(Math.abs(scrollToStory(s,route)-s*TOTAL_UNITS/28)<1e-12);}
 assert.equal(autoplayDuration(route),150+route.seconds);
});

test('stationary entry and empty people remain strictly invertible',()=>{
 for(const route of [base,createPeopleRoute({leaders:[],members:[]})]){
  let previous=-1;
  for(let i=0;i<=1000;i++){
   const t=route.windows[0].readEnd*i/1000,s=scrollAt(route,t);
   assert.ok(s>previous,'stationary entry collapsed to a flat scroll coordinate');
   assert.ok(Math.abs(chapterAt(scrollToStory(s,route)).peopleT-t)<1e-10);previous=s;
  }
  assert.equal(scrollAt(route,1),1);
 }
});
