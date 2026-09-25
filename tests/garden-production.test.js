import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBiomes,groundHeight} from '../src/biomes.js';
import {gardenPose} from '../src/garden-path.js';
import {pose} from '../src/journey.js';

for(const mobile of [false,true]){
  test(`Garden ${mobile?'mobile':'desktop'} replaces temporary realistic assets on the first world frame`,()=>{
    const scene=new T.Scene(),camera=new T.PerspectiveCamera();
    const world=createBiomes(scene,mobile);
    world.update(camera,.02);
    const garden=scene.getObjectByName('garden-asset-gate');
    assert.ok(garden,'the approved B scene is immediately present');
    assert.equal(world.gardenStatus,'ready');
    assert.equal(scene.getObjectByName('garden-sculpted-landscape'),undefined);
    assert.ok(garden.getObjectByName('garden-petal-portal'));
    const terrain=scene.getObjectsByProperty('name','continuous-3d-ground');
    assert.ok(terrain.length>=2);
    for(const ground of terrain.slice(0,2))assert.equal(ground.material.map,null,'no scanned forest texture');
  });
}

test('Garden entrance keeps the Hero camera continuous and provides a volumetric corridor',()=>{
  const end=pose(1,new T.PerspectiveCamera(),false);
  const entry=gardenPose(0,new T.PerspectiveCamera(),false);
  assert.ok(Math.hypot(...end.position.map((v,i)=>v-entry.position[i]))<.0001);
  const scene=new T.Scene(),world=createBiomes(scene,false);
  world.update(new T.PerspectiveCamera(),.5);
  const arch=scene.getObjectByName('garden-petal-portal');
  const extent=new T.Box3().setFromObject(arch).getSize(new T.Vector3());
  assert.ok(extent.y>34,'petals rise above the camera corridor');
  assert.ok(extent.z>32,'petals sit on both sides of the corridor');
  assert.ok(groundHeight(188,0)>-60,'the corridor is attached to the continuous ground');
});
