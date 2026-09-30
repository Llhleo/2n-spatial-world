import * as T from 'three';
import {worldHeight} from './world-surface.js';
const places=[['Garden',133,-12,88,182],['Desert',352,-18,295,424],['Ocean',586,-12,475,707],['Jungle',975,-10,845,1092],['Hell',1400,-12,1245,1540]];
function textTexture(name){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,768,192);ctx.font='500 104px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#faf5e9';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;ctx.fillText(name,384,96);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function createRegionNames(textureFactory=textTexture){
 const group=new T.Group();group.name='world-region-names';
 for(const [name,x,z] of places){const label=new T.Sprite(new T.SpriteMaterial({map:textureFactory(name),transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:false}));label.name=`region-name-${name.toLowerCase()}`;label.position.set(x,worldHeight(x,z)+17,z);label.scale.set(25,6.25,1);label.visible=false;group.add(label);}
 return {group,update(x){for(let i=0;i<places.length;i++){const [,anchor,,start,end]=places[i],label=group.children[i];label.visible=x>start&&x<end;label.material.opacity=T.MathUtils.smoothstep(x,start,start+12)*(1-T.MathUtils.smoothstep(x,end-22,end));}}};
}
