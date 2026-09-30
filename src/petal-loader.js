// Shared bounded queue: avoid duplicate Golden Leaf downloads and unbounded
// GLB/image decoding on Safari. Failed entries may be retried explicitly.
const cache=new Map(),queue=[];let active=0;
const later=()=>new Promise(resolve=>setTimeout(resolve,0));
function drain(){while(active<2&&queue.length){const job=queue.shift();active++;job.run().then(job.resolve,job.reject).finally(()=>{active--;drain();});}}
function bounded(run,priority=0){return new Promise((resolve,reject)=>{queue.push({run,resolve,reject,priority});queue.sort((a,b)=>a.priority-b.priority);drain();});}
export async function fetchPetalBytes(url,fetcher=fetch,timeout=15000){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal});if(!response.ok)throw new Error(`Petal request returned ${response.status}`);const type=response.headers.get('content-type')||'';if(type.includes('text/html'))throw new Error('Petal request returned a login page');const bytes=await response.arrayBuffer();if(new DataView(bytes).getUint32(0,true)!==0x46546c67)throw new Error('Invalid GLB response');return bytes;})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Petal download timed out'));},timeout);})]);}finally{clearTimeout(timer);}
}
export function loadPetal(url,priority=0){
 if(cache.has(url))return cache.get(url);
 const promise=bounded(async()=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');let bytes;
  for(let attempt=0;attempt<2;attempt++){try{bytes=await fetchPetalBytes(url);break;}catch(error){if(attempt===1)throw error;await later();}}
  await later();let timer;
  try{const gltf=await Promise.race([new GLTFLoader().parseAsync(bytes,''),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Petal decoding timed out')),15000);})]);const mesh=gltf.scene.getObjectByProperty('isMesh',true);if(!mesh)throw new Error('GLB contains no mesh');return mesh;}finally{clearTimeout(timer);}
 },priority);cache.set(url,promise);promise.catch(()=>cache.delete(url));return promise;
}
export async function loadPetalCatalog(entries,onAsset){
 const catalog={},failures=[];
 await Promise.all(entries.map(async([name,path],index)=>{try{const mesh=await loadPetal(`${import.meta.env.BASE_URL}${path}`,index*3+(path.includes("ocean-petals")?2:path.includes("desert-petals")?1:0));catalog[name]=mesh;if(onAsset){await later();onAsset(name,mesh);}}catch(error){failures.push({name,message:error.message});}}));
 Object.defineProperty(catalog,'failures',{value:failures});return catalog;
}
