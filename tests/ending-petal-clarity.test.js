import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';

test('only the new-road particle petals receive a bounded depth haze without losing solid shading',()=>{
 const memory=createMemoryScene(),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial({fog:true})),camera=new T.PerspectiveCamera(48,.46,.2,2400);
 memory.install(asset,'garden','rose');
 const captured=new T.Group();captured.userData.departureAnchors=[0,1].map(branch=>({id:'petal-'+branch,key:'garden:rose',branch,order:0,worldMatrix:new T.Matrix4().makeTranslation(branch?10:-10,branch?20:-20,-30),geometry:asset.geometry,material:asset.material}));memory.captureEntry(captured,camera);
 try{
  memory.update({memoryPhase:2,eventIndex:2,nextT:.4,particleEnding:true,roadArrival:{}},camera,0);
  const pool=memory.group.children.find(o=>o.isInstancedMesh),shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};pool.material.onBeforeCompile(shader);
  const clarity=shader.uniforms.memoryEndingClarity;assert.ok(clarity,'actual petal fog shader needs the ending clarity weight');assert.equal(clarity.value,1);
  assert.ok(shader.fragmentShader.includes('fogFactor = min('));assert.equal(pool.material.depthWrite,true);assert.equal(pool.material.fog,true,'captured models keep their shader fog flag');assert.ok(pool.material.isMeshStandardMaterial,'retain lit 3D surfaces');
  memory.update({memoryPhase:2,eventIndex:2,nextT:0,particleEnding:true,roadArrival:{}},camera,0);assert.equal(clarity.value,0,'haze remains continuous at the road boundary');
  memory.update({memoryPhase:2,eventIndex:2,nextT:.4,particleEnding:true},camera,0);assert.equal(clarity.value,0,'the original route keeps its captured fog');
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
