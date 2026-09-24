import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import * as T from 'three';
import {pose} from '../src/journey.js';
import {gardenPose} from '../src/garden-path.js';
import {createBiomes,groundHeight,desertBlend} from '../src/biomes.js';

test('Hero passes position and orientation continuously into Garden on both layouts',()=>{
  for(const portrait of [false,true]){
    const from=new T.PerspectiveCamera(),to=new T.PerspectiveCamera();
    pose(1,from,portrait);gardenPose(0,to,portrait);
    assert.ok(from.position.distanceTo(to.position)<1e-5);
    assert.ok(from.quaternion.angleTo(to.quaternion)<1e-5);
  }
});
test('Garden to Desert remains one sampled surface and material transition',()=>{
  for(const x of [188,296,404])for(const z of [-120,-10,68]){
    assert.ok(Math.abs(groundHeight(x-.001,z)-groundHeight(x+.001,z))<.01);
    assert.ok(Math.abs(desertBlend(x-.001)-desertBlend(x+.001))<.001);
  }
  const scene=new T.Scene(),world=createBiomes(scene,true);
  const camera=new T.PerspectiveCamera(48,1,.2,900);
  gardenPose(.65,camera,true);world.update(camera,.65);
  assert.ok(scene.children.filter(o=>o.type==='Group'&&o.visible).length>=2);
  assert.ok(world.stats.instances<1250 && world.stats.groundTriangles<11000);
});
