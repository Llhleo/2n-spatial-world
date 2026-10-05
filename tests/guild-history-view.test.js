import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Text} from 'troika-three-text';
const api=await import('../src/guild-history-view.js').catch(()=>({}));
import {createHistoryRoute,sampleHistory} from '../src/guild-history-route.js';
test('history view measures wrapped text and publishes one warm-white station without growing children',async()=>{
 assert.equal(typeof api.createHistoryView,'function');
 const original=Text.prototype.sync;
 Text.prototype.sync=function(){const b=[];let x=0,y=0;for(const ch of this.text){if(x+.7>this.maxWidth){x=0;y-=1.4;}b.push(x,y,x+.65,y+1);x+=.7;}this._textRenderInfo={glyphBounds:new Float32Array(b)};this.dispatchEvent({type:'synccomplete'});};
 const events=Array.from({length:3},(_,i)=>({id:String(i),date:'2026-08-18',title:'一片花瓣，见证繁盛',body:'一起走过的日子，留下值得铭记的印记。'.repeat(3)}));
 const route=createHistoryRoute(events,{position:[0,100,100],target:[0,55,30],up:[0,1,0]});let view;
 try{view=api.createHistoryView(events,route);await view.prepare();const count=view.group.children.length;
 for(const [width,height] of [[414,896],[896,414],[280,600]]){view.resize({width,height});await view.prepare();const cam=new T.PerspectiveCamera(48,width/height,.2,2400),s=sampleHistory(route,1,cam.aspect);cam.position.fromArray(s.position);cam.up.fromArray(s.up);cam.lookAt(...s.target);cam.updateMatrixWorld();view.update(s,cam,{width,height});
 const visible=[];view.group.traverse(o=>{if(o instanceof Text&&o.parent.visible&&o.visible)visible.push(o);});assert.equal(visible.length,3);assert.ok(visible.every(o=>!o.strokeWidth&&o.color===0xf4f0df));
 for(const text of visible){const b=text.textRenderInfo.glyphBounds;for(let i=0;i<b.length;i+=4)for(const x of [b[i],b[i+2]])for(const y of [b[i+1],b[i+3]]){const p=new T.Vector3(x,y,0).applyMatrix4(text.matrixWorld).project(cam);assert.ok(Math.abs(p.x)<=.76+1e-6&&Math.abs(p.y)<=.4+1e-6);}}
 assert.equal(view.group.children.length,count);}
 view.dispose();view.dispose();assert.equal(view.ready,false);
 }finally{Text.prototype.sync=original;view?.dispose();}
});
