import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/loading-diagnostics.js').catch(()=>({}));
test('loading history remains bounded and strips URL paths/query secrets',()=>{
 assert.equal(typeof api.createLoadingDiagnostics,'function');
 const log=api.createLoadingDiagnostics({limit:3});
 for(let i=0;i<5;i++)log.record({kind:'download',url:`https://mirror.example/private/model-${i}.glb?token=SECRET`});
 const state=log.snapshot();assert.equal(state.events.length,3);assert.equal(state.events[0].file,'model-2.glb');assert.equal(state.source,'mirror.example');assert.equal(JSON.stringify(state).includes('SECRET'),false);assert.equal(JSON.stringify(state).includes('/private/'),false);
});
test('cache and winning mirror events produce useful counters without claiming downloads decoded',()=>{
 assert.equal(typeof api.createLoadingDiagnostics,'function');
 const log=api.createLoadingDiagnostics();log.record({kind:'cache',url:'/assets/a.glb'});log.record({kind:'winner',url:'https://backup.example/assets/b.glb',duration:25});log.record({kind:'error',url:'https://bad.example/assets/c.glb',reason:'hash'});
 const s=log.snapshot();assert.equal(s.cacheHits,1);assert.equal(s.downloaded,1);assert.equal(s.failures,1);assert.equal(s.source,'backup.example');
});
test('a diagnostic subscriber error never interrupts resource loading',()=>{
 assert.equal(typeof api.createLoadingDiagnostics,'function');
 const log=api.createLoadingDiagnostics();log.subscribe(()=>{throw new Error('UI detached')});assert.doesNotThrow(()=>log.record({kind:'winner',url:'/a.glb'}));assert.equal(log.snapshot().downloaded,1);
});
