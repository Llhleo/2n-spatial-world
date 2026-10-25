import test from 'node:test';
import assert from 'node:assert/strict';
import {createGesturePlayback} from '../src/gesture-playback.js';

test('gesture magnitude cannot change playback speed or queue more than one stop',()=>{
 const a=createGesturePlayback([0,5.5,11.5,14.3,20.3,23.1,30.6,36,54]);
 const b=createGesturePlayback([0,5.5,11.5,14.3,20.3,23.1,30.6,36,54]);
 a.request(1);for(let i=0;i<100;i++)b.request(1);
 for(let i=0;i<60;i++){a.advance(1/60);b.advance(1/60);}
 assert.ok(Math.abs(a.time-1)<1e-8);assert.equal(a.time,b.time);assert.equal(a.target,5.5);
});
test('reverse begins at displayed time and reaches the previous stop',()=>{
 const p=createGesturePlayback([0,5,10]);p.seek(7);p.request(-1);
 p.advance(.05);assert.equal(p.time,6.95);assert.equal(p.target,5);
 p.request(1);p.advance(.05);assert.equal(p.time,7);assert.equal(p.target,10);
});
test('release continues to current target then waits for another gesture',()=>{
 const p=createGesturePlayback([0,1,2]);assert.equal(p.advance(.05),0);p.request(1);
 for(let i=0;i<60;i++)p.advance(.05);
 assert.equal(p.time,1);assert.equal(p.playing,false);p.request(1);assert.equal(p.target,2);
});
test('background frame delays cannot jump through the story',()=>{
 const p=createGesturePlayback([0,5,10]);p.request(1);assert.equal(p.advance(20),.05);
 p.seek(10);p.request(1);assert.equal(p.advance(.05),10);
});
