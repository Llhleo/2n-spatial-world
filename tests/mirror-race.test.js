import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fetchAssetBytes} from '../src/asset-transport.js';
const bytes=Buffer.from('glTFsame-release-model');
const entry={url:'/assets/model-transport/test-hash.glb.gz',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
test('commit-pinned raw CDN wins when packed sources fail',async()=>{
 const rawMirror='https://cdn.jsdelivr.net/gh/example/repo@123/public/assets/test.glb';
 const calls=[];const fetcher=async url=>{calls.push(url);return url===rawMirror?new Response(bytes):new Response('missing',{status:404});};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry:{...entry,rawMirror},store:null,fetcher,mirrors:[],timeout:100})),bytes);
 assert.ok(calls.includes(rawMirror));assert.ok(!calls.includes('/assets/test.glb'));
});
test('wrong-version raw CDN is rejected before the original fallback',async()=>{
 const rawMirror='https://cdn.jsdelivr.net/gh/example/repo@123/public/assets/test.glb';let requested=false;
 const fetcher=async url=>{if(url===rawMirror){requested=true;return new Response(Buffer.from('glTFwrong-release'));}return url==='/assets/test.glb'?new Response(bytes):new Response('missing',{status:404});};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry:{...entry,rawMirror},store:null,fetcher,mirrors:[],timeout:100})),bytes);assert.equal(requested,true);
});
test('fast valid mirror wins and cancels the stalled origin',async()=>{
 let aborted=false;
 const fetcher=async(url,{signal})=>url.startsWith('https://mirror.example/')?new Response(bytes):new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}));
 const result=await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100});
 assert.deepEqual(Buffer.from(result),bytes);assert.equal(aborted,true);
});
test('fast wrong-version model cannot beat slower valid mirror',async()=>{
 const fetcher=async(url)=>{if(url.startsWith('https://mirror.example/')){await new Promise(r=>setTimeout(r,10));return new Response(bytes);}return new Response(Buffer.from('glTFwrong-release'))};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100})),bytes);
});
test('all sources failing rejects finitely without downloading duplicate original files from every mirror',async()=>{
 let calls=0;await assert.rejects(fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher:async()=>{calls++;return new Response('missing',{status:404})},mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100}));assert.equal(calls,3);
});
test('a mirror pointing at the current host never duplicates the same model request',async()=>{
 const previous=globalThis.location;globalThis.location={href:'https://mirror.example/',origin:'https://mirror.example'};
 try{let calls=0;await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,15));return new Response(bytes)},mirrors:['https://mirror.example/'],hedgeDelay:2,timeout:100});assert.equal(calls,1);}finally{globalThis.location=previous;}
});
