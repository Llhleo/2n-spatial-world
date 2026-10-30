import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareRoadPetalMaterial} from '../src/road-story/petal-material.js';

test('remote riders dissolve into depth while the near models keep opaque self occlusion',()=>{
 const material=new T.MeshStandardMaterial({fog:false});
 prepareRoadPetalMaterial(material);
 assert.equal(material.fog,true);
 assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);
 const shader={uniforms:{},fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
 const fade=shader.uniforms.roadPetalFade.value;
 assert.equal(T.MathUtils.smoothstep(300,fade.x,fade.y),0,'near petal colors are unchanged');
 assert.equal(T.MathUtils.smoothstep(850,fade.x,fade.y),1,'vanishing road tails no longer form colored necklaces');
 assert.ok(shader.fragmentShader.includes('fogFactor = max('),'actual fog output uses the depth band');
 material.dispose();
});
