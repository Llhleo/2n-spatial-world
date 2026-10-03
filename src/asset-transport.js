import manifest from './transport-manifest.js';
const glb=bytes=>bytes.byteLength>=4&&new DataView(bytes).getUint32(0,true)===0x46546c67;
async function verified(bytes,entry){
 if(!glb(bytes))throw new Error('Invalid GLB response');
 if(entry){if(bytes.byteLength!==entry.bytes)throw new Error('Asset size mismatch');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==entry.sha256)throw new Error('Asset checksum mismatch');
 }return bytes;
}
function lookup(url){
 for(const [path,entry] of Object.entries(manifest))if(url.endsWith(path))return {...entry,url:url.slice(0,-path.length)+entry.url};
}
async function localStore(){try{return typeof caches!=='undefined'?await caches.open('2n-lossless-models-v1'):null;}catch{return null;}}
async function download(url,fetcher,timeout){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal,cache:'force-cache'});
  if(!response.ok)throw new Error(`Model request returned ${response.status}`);
  if((response.headers.get('content-type')||'').includes('text/html'))throw new Error('Model request returned a login page');
  return response.arrayBuffer();})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Model download timed out'));},timeout);})]);}finally{clearTimeout(timer);}
}
export async function fetchAssetBytes(url,{entry=lookup(url),store,fetcher=fetch,timeout=30000}={}){
 if(!entry)return verified(await download(url,fetcher,timeout));
 if(store===undefined)store=await localStore();
 const key=entry.url;
 if(store){try{const hit=await store.match(key);if(hit)return await verified(await hit.arrayBuffer(),entry);}catch{try{await store.delete(key);}catch{}}}
 let bytes;
 try{
  bytes=await download(entry.url,fetcher,timeout);
  // Some hosts decode Content-Encoding automatically; never decompress twice.
  if(!glb(bytes))bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  await verified(bytes,entry);
 }catch{bytes=await verified(await download(url,fetcher,timeout),entry);}
 if(store){try{await store.put(key,new Response(bytes,{headers:{'content-type':'model/gltf-binary'}}));}catch{}}
 return bytes;
}
