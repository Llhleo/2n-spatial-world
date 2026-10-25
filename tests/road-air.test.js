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
