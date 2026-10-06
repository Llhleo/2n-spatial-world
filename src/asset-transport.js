import manifest from './transport-manifest.js';
const glb=bytes=>bytes.byteLength>=4&&new DataView(bytes).getUint32(0,true)===0x46546c67;
async function unpack(bytes){return glb(bytes)?bytes:new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
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
// Large GLBs should not be punished by the same timeout as 300-500 KB petals.
// The budget assumes a weak ~1 Mbps link for hashed compressed assets, caps at
// 90 s, and still keeps ordinary models at the established 30 s floor.
export const transferTimeout=bytes=>Math.min(90000,Math.max(30000,12000+Math.ceil(Math.max(0,bytes||0)/131072)*1000));
function bounded(work,ms,fallback=null){let timer;return Promise.race([Promise.resolve(work).catch(()=>fallback),new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms);})]).finally(()=>clearTimeout(timer));}
let localStorePromise;
async function localStore(ms){try{localStorePromise??= typeof caches!=='undefined'?bounded(caches.open('2n-lossless-models-v1'),ms):Promise.resolve(null);return await localStorePromise;}catch{return null;}}
async function download(url,fetcher,timeout){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal,cache:'force-cache'});
  if(!response.ok)throw new Error(`Model request returned ${response.status}`);
  if((response.headers.get('content-type')||'').includes('text/html'))throw new Error('Model request returned a login page');
  return response.arrayBuffer();})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Model download timed out'));},timeout);})]);}finally{clearTimeout(timer);}
}
export async function fetchAssetBytes(url,{entry=lookup(url),store,fetcher=fetch,timeout,cacheTimeout=800}={}){
 const packedTimeout=timeout??transferTimeout(entry?.compressedBytes??entry?.bytes);
 const sourceTimeout=timeout??transferTimeout(entry?.bytes);
 if(!entry)return verified(await download(url,fetcher,sourceTimeout));
 if(store===undefined)store=await localStore(cacheTimeout);
 const key=entry.url;
 if(store){try{const hit=await bounded(store.match(key),cacheTimeout);if(hit){const bytes=await bounded(hit.arrayBuffer(),cacheTimeout);if(bytes)return await verified(await unpack(bytes),entry);}}catch{try{void bounded(store.delete(key),cacheTimeout);}catch{}}}
 let bytes,cacheBytes;
 try{
  bytes=await download(entry.url,fetcher,packedTimeout);cacheBytes=bytes;
  // Some hosts decode Content-Encoding automatically; never decompress twice.
  bytes=await unpack(bytes);
  await verified(bytes,entry);
 }catch{bytes=await verified(await download(url,fetcher,sourceTimeout),entry);cacheBytes=bytes;}
 // Persistence is optional: a slow/quota-limited Safari cache cannot hold up a valid model.
 if(store){try{void bounded(store.put(key,new Response(cacheBytes,{headers:{'content-type':'application/octet-stream'}})),cacheTimeout);}catch{}}
 return bytes;
}
