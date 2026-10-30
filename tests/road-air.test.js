import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {renderRoadStory} from '../src/road-story/view.js';
test('history uses deep neutral air while preserving the departing world fog',()=>{
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x63282e,.0036);const original=scene.fog.color.clone();
 const camera=new T.PerspectiveCamera(),roads={group:new T.Group(),update(){}},memory={group:new T.Group()},history={group:new T.Group()},nextView={group:new T.Group()};scene.add(roads.group,memory.group,history.group,nextView.group);
 let rendered;renderRoadStory({scene,camera,roads,memory,history,nextView,state:{},chapter:{chapter:'history',historyT:.5},viewport:{},dt:0,reducedMotion:false,departureGroups:[],updateEnvironment(){scene.fog.color.set(0x63282e);},renderer:{render(){rendered=scene.fog.color.clone();}}});
 assert.ok(Math.abs(rendered.r-new T.Color(0x06090d).r)<1e-6);
 assert.ok(scene.fog.color.equals(original));
});

test('the wide ending clearing extinguishes distant road remnants without changing reading air',()=>{
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x63282e,.0036);const original=scene.fog.density,camera=new T.PerspectiveCamera(48,896/414);
 const roads={group:new T.Group(),endingEntry:p=>p,update(){}},memory={group:new T.Group(),setPreview(){},update(){},shot:{target:[0,0,-14]}},history={group:new T.Group()},nextView={group:new T.Group(),ready:true,update(){}};
 scene.add(roads.group,memory.group,history.group,nextView.group);
 const densities=[];
 for(const seconds of [28.6,30.6,33,36,36,33,30.6,28.6]){
  renderRoadStory({scene,camera,roads,memory,history,nextView,state:{entryPose:{position:[0,0,0],target:[0,0,-1],up:[0,1,0]},particleEnding:false},chapter:{chapter:seconds===36?'next':'history',historyT:seconds/36,nextT:1},viewport:{},dt:0,reducedMotion:false,departureGroups:[],renderer:{render(){densities.push(scene.fog.density);}}});
  assert.equal(scene.fog.density,original,'outside chapter fog is restored');
 }
 assert.equal(densities[0],.0018);assert.equal(densities[1],.0018);
 assert.ok(Math.exp(-Math.pow(693.83*densities[3],2))<.01,'nearest projected landscape road has less than 1% remaining contrast');
 assert.deepEqual(densities.slice(4),densities.slice(0,4).reverse(),'reverse exits reconstruct the same atmosphere');
});

test('road reading and flights keep world and ending lighting from changing the palette',()=>{
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x63282e,.0036);const camera=new T.PerspectiveCamera();
 const sun=new T.DirectionalLight(0xff6644,1.4),roads={group:new T.Group(),endingEntry:p=>p,update(){}},memory={group:new T.Group(),setPreview(){},update(){},shot:{target:[0,0,-14]}},history={group:new T.Group()},nextView={group:new T.Group(),ready:true,update(){}};
 const memoryKey=new T.DirectionalLight(0xffffff,2.8),studio=new T.AmbientLight(0xffffff,.65);memory.group.add(memoryKey);roads.group.add(studio);scene.add(sun,roads.group,memory.group,history.group,nextView.group);
 for(const seconds of [9.3,18.1,20.5,22.9,23.2,28.6,33]){
  renderRoadStory({scene,camera,roads,memory,history,nextView,state:{entryPose:{position:[0,0,0],target:[0,0,-1],up:[0,1,0]},particleEnding:false},chapter:{chapter:'history',historyT:seconds/36},viewport:{},dt:0,reducedMotion:false,departureGroups:[],updateEnvironment(){sun.color.set(seconds>20?0x00ff00:0xff0000);sun.intensity=7;},renderer:{render(){assert.ok(!sun.visible||sun.intensity===0,'moving over old biome coordinates must not recolor the road');assert.ok(!memory.group.visible||!memoryKey.visible||memoryKey.intensity===0,'preparing ending followers must not add a second studio');assert.equal(studio.intensity,.65);}}});
  assert.equal(sun.visible,true);assert.equal(sun.intensity,1.4);assert.equal(memoryKey.visible,true);assert.equal(memoryKey.intensity,2.8);
 }
});
