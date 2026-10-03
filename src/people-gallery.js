import * as T from 'three';
import {Text} from 'troika-three-text';
import {normalizePeople} from './people-data.js';
import {peopleAnchor, peopleState, peopleTextLayout} from './people-path.js';
import {readingPoint, readingQuaternion} from './lookback.js';
import {prepareWorldText} from './companionship.js';
import {createCourtyardGallery} from './people-layout.js';

/** Independent appended chapter; its lifecycle never changes biome readiness. */
export function createPeopleGallery(data, route) {
 if(route)return createCourtyardGallery(data,route);
 const people=normalizePeople(data);
 if(people.errors.length)throw new Error(people.errors.join('\n'));
 if(people.leaders.length>5)throw new Error('第一轮最多展示五位管理层。');
 const group=new T.Group();group.name='people-gallery';group.visible=false;
 const leaders=new T.Group();leaders.name='people-leaders';group.add(leaders);
 const crowd=new T.Group();crowd.name='people-crowd';crowd.visible=false;group.add(crowd);
 const cards=[],labels=[],members=[],listeners=new Map();
 let prepared=false,error=null,inflight=null,disposed=false;
 const font=`${import.meta.env?.BASE_URL||'/'}assets/fonts/people-sc-semibold.woff?v=people-sdf256-1`;

 function label(content,size,tier,personId) {
  const text=new Text();text.text=content;text.font=font;text.fontSize=size;
  text.anchorX='center';text.anchorY='middle';text.textAlign='center';
  text.whiteSpace='pre';text.lineHeight=1.38;text.color=tier==='name'?0xf4f0df:0xd5dbce;
  text.sdfGlyphSize=256;text.gpuAccelerateSDF=false;
  text.material.depthWrite=false;text.material.transparent=true;text.material.toneMapped=false;
  text.visible=false;text.userData.tier=tier;if(personId)text.userData.personId=personId;
  labels.push(text);return text;
 }
 people.leaders.forEach((person,index)=>{
  if(person.intro.split('\n').length>2)throw new Error('人物简介最多两行。');
  const card=new T.Group(),anchor=peopleAnchor(index);card.name='person-'+person.id;
  card.position.fromArray(anchor.position);card.quaternion.fromArray(anchor.quaternion);
  card.userData.index=index;card.userData.personId=person.id;card.visible=false;
  const tiers=[['name',person.name,6.2,8],['role',person.role,2.8,0],['intro',person.intro,2.35,-7]];
  for(const [tier,content,size,y] of tiers)if(content) {
   const text=label(content,size,tier,person.id);text.position.y=y;
   text.userData.authoredPosition=text.position.clone();card.add(text);
  }
  cards.push(card);leaders.add(card);
 });

 // Neutral spatial nodes, never portraits or individual petal identities.
 const nodeGeometry=new T.SphereGeometry(.42,8,6),nodeMaterial=new T.MeshBasicMaterial({color:0xc5d0ac,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
 const nodes=new T.InstancedMesh(nodeGeometry,nodeMaterial,people.members.length);
 nodes.name='people-spatial-nodes';nodes.frustumCulled=false;crowd.add(nodes);
 const matrix=new T.Matrix4(),nodeScale=new T.Vector3(1,1,1);
 people.members.forEach((name,index)=>{
  const column=index%11,row=Math.floor(index/11),x=(column-5)*9,y=(4-row)*5.2;
  const point=readingPoint(x,y,-224-Math.abs(column-5)*1.6-(row%3)*2);
  matrix.compose(point,readingQuaternion,nodeScale);nodes.setMatrixAt(index,matrix);
  const text=label(name,2,'name');text.userData.memberIndex=index;
  text.position.copy(point).add(new T.Vector3(0,1.8,0).applyQuaternion(readingQuaternion));
  text.quaternion.copy(readingQuaternion);crowd.add(text);members.push(text);
 });
 nodes.instanceMatrix.needsUpdate=true;

 function measure(card) {
  if(!card.children.every(text=>text.textRenderInfo))return false;
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(const text of card.children) {
   const glyphs=text.textRenderInfo.glyphBounds,p=text.userData.authoredPosition;
   for(let i=0;i<glyphs.length;i+=4) {
    bounds[0]=Math.min(bounds[0],glyphs[i]+p.x);bounds[1]=Math.min(bounds[1],glyphs[i+1]+p.y);
    bounds[2]=Math.max(bounds[2],glyphs[i+2]+p.x);bounds[3]=Math.max(bounds[3],glyphs[i+3]+p.y);
   }
  }
  const width=bounds[2]-bounds[0],height=bounds[3]-bounds[1];
  if(![width,height].every(v=>Number.isFinite(v)&&v>0))return false;
  const center=new T.Vector3((bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2,0);
  for(const text of card.children)text.position.copy(text.userData.authoredPosition).sub(center);
  card.userData.measured={width,height};card.userData.measuredBounds=[-width/2,-height/2,width/2,height/2];
  return true;
 }
 function refresh() {
  if(disposed)return;
  const measured=cards.map(measure).every(Boolean);
  prepared=measured&&labels.every(text=>text.textRenderInfo);
  if(prepared)error=null;
 }
 for(const text of labels) {
  const complete=()=>refresh();listeners.set(text,complete);text.addEventListener('synccomplete',complete);
 }
 function prepare(timeoutMs=20000) {
  if(disposed)return Promise.reject(new Error('人物章节已释放。'));
  if(prepared)return Promise.resolve();
  if(inflight)return inflight;
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)return Promise.reject(new Error('人物文字超时必须为有限正数。'));
  error=null;
  inflight=Promise.all(labels.map(text=>prepareWorldText(text,timeoutMs))).then(()=>{
   refresh();if(!prepared)throw new Error('人物文字缺少有效字形范围。');
  }).catch(reason=>{if(!disposed&&!prepared)error=reason;throw reason;}).finally(()=>{inflight=null;});
  return inflight;
 }
 function update(t,camera,dt=0,reduced=false) {
  if(disposed)return;
  const state=peopleState(t);group.visible=t>0;
  leaders.visible=state.focus>=0;crowd.visible=state.crowd>0;
  for(const card of cards) {
   const index=card.userData.index,focal=index===state.focus;
   card.userData.focal=focal;
   // Names only for immediately adjacent authored anchors. Their roles and
   // intros never appear; card transforms stay fixed even when offscreen.
   const nearby=state.focus>=0&&Math.abs(index-state.focus)<=1;
   card.visible=Boolean(card.userData.measured)&&nearby;
   if(card.userData.measured) {
    const fit=peopleTextLayout(index,camera,card.userData.measured);card.scale.setScalar(fit.scale);
    card.userData.layout=fit;if(fit.scale===0)card.visible=false;
   }
   for(const text of card.children) {
    text.visible=card.visible&&(focal||text.userData.tier==='name');
    text.material.opacity=focal?state.opacity:.13;
   }
  }
  nodes.visible=crowd.visible;nodeMaterial.opacity=.34*state.crowd;
  const nearby=[];
  camera.updateMatrixWorld();
  for(const text of members) {
   text.visible=false;
   if(!crowd.visible||!text.textRenderInfo)continue;
   const p=text.position.clone().project(camera);
   if(p.z<=-1||p.z>=1||Math.abs(p.x)>=.55||Math.abs(p.y)>=.5)continue;
   // A central node is insufficient: the complete real name must also fit.
   const glyphs=text.textRenderInfo.glyphBounds;let fits=true;
   for(let i=0;i<glyphs.length&&fits;i+=4)for(const x of [glyphs[i],glyphs[i+2]])for(const y of [glyphs[i+1],glyphs[i+3]]) {
    const corner=new T.Vector3(x,y,0).applyQuaternion(text.quaternion).add(text.position).project(camera);
    fits&&=corner.z>-1&&corner.z<1&&Math.abs(corner.x)<=.68&&Math.abs(corner.y)<=.66;
   }
   if(fits)nearby.push({text,distance:p.x*p.x+p.y*p.y});
  }
  nearby.sort((a,b)=>a.distance-b.distance);
  for(const {text} of nearby.slice(0,3)) {text.visible=true;text.material.opacity=.55*state.crowd;}
  // The chapter intentionally has no autonomous spin/drift: both ordinary and
  // reduced-motion views are absolute scroll samples, including paused frames.
 }
 return {group,prepare,update,resize(aspect){if(!Number.isFinite(aspect)||aspect<=0)throw new RangeError('人物画幅必须为正数。');},
  get ready(){return prepared;},get error(){return error;},retry:prepare,
  dispose(){if(disposed)return;disposed=true;prepared=false;group.visible=false;
   for(const text of labels){text.removeEventListener('synccomplete',listeners.get(text));text.dispose();text.material.dispose();}
   nodes.dispose();nodeGeometry.dispose();nodeMaterial.dispose();group.clear();
  }};
}
