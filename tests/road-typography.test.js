import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roadTextParts} from '../src/road-story/typography.js';
import * as T from 'three';
import {lightTrackPoint,sampleRoadCamera} from '../src/road-story/path.js';

const records=JSON.parse(fs.readFileSync(new URL('../content/history.json',import.meta.url))).events;
test('road body copy keeps complete words and punctuation within readable paragraphs',()=>{
 for(const [kind,record] of records.entries()){
  const body=roadTextParts(record,kind).filter(p=>p.role==='body');
  assert.equal(body.map(p=>p.text).join(''),record.body,'approved copy remains exact');
  for(const line of body){
   assert.ok(!/^[，。；、：！？]/.test(line.text),`punctuation cannot lead ${line.text}`);
   assert.ok(line.text.trim().length>=6,`avoid orphan lines: ${line.text}`);
  }
  for(const word of ['2n','Florr'])if(record.body.includes(word))assert.ok(body.some(p=>p.text.includes(word)),`${word} must remain intact`);
  assert.ok(body.length<=6,'a reading area must not become a narrow nine-line ribbon');
  assert.ok(body.some((p,i)=>i&&p.y-body[i-1].y>60),'paragraphs have visible breathing space');
 }
});

test('traveling light cores and their tails stay outside the active reading lines',()=>{
 const meshes=JSON.parse(fs.readFileSync(new URL('../public/assets/road-story/text-meshes.json',import.meta.url)));
 const entry=null,camera=new T.PerspectiveCamera(40,864/1872,.2,2400);
 const positions=[[0,0,170],[-3,0,174],[0,5,208]],targets=[[0,0,-12],[1,0,-20],[0,6,-8]],offsets=[[0,0,0],[480,0,-520],[0,0,-1040]],depths=[235,270,245];
 for(let kind=0;kind<3;kind++)for(const seconds of [[8.6,9.3,10.4],[17.1,18.1,19.4],[25,28.6,30]][kind]){
  const pose=sampleRoadCamera(seconds,entry);camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.quaternion);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const frame=new T.Matrix4().lookAt(new T.Vector3(...positions[kind]),new T.Vector3(...targets[kind]),new T.Vector3(0,1,0));frame.setPosition(new T.Vector3(...positions[kind]).add(new T.Vector3(...offsets[kind])));
  const unit=2*depths[kind]*Math.tan(T.MathUtils.degToRad(20))/1872;
  const boxes=roadTextParts(records[kind],kind).map(p=>{
   const data=meshes[p.text],xs=data.positions.filter((_,i)=>i%3===0),ys=data.positions.filter((_,i)=>i%3===1);
   const points=[Math.min(...xs),Math.max(...xs)].flatMap(x=>[Math.min(...ys),Math.max(...ys)].map(y=>new T.Vector3((-432+p.x+x*p.size)*unit,(936-p.y-p.size*.9+y*p.size)*unit,-depths[kind]).applyMatrix4(frame).project(camera)));
   return {text:p.text,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))};
  });
  for(let i=0;i<600;i++){
   const p=lightTrackPoint(kind,i/600).project(camera),mx=32/864*2,my=32/1872*2;
   for(const b of boxes)assert.ok(p.x+mx<b.left||p.x-mx>b.right||p.y+my<b.bottom||p.y-my>b.top,`light crosses ${b.text} at scene ${kind}, phase ${i/600}`);
  }
 }
});
