import fs from 'node:fs/promises';
import * as T from 'three';
const source=JSON.parse(await fs.readFile('scripts/road-story/cache/text-resolved.json','utf8')),result={};
for(const [text,data] of Object.entries(source)){
 const positions=[],indices=[];
 for(const glyph of data.glyphs)for(const part of glyph.parts){
  const vec=r=>r.map(p=>new T.Vector2(p[0]+glyph.x,p[1]));
  const outer=vec(part.outer),holes=part.holes.map(vec),faces=T.ShapeUtils.triangulateShape(outer,holes),all=outer.concat(...holes),base=positions.length/3;
  for(const p of all)positions.push(p.x/data.units,p.y/data.units,0);
  for(const f of faces)indices.push(...f.map(k=>base+k));
 }
 result[text]={positions:positions.map(v=>Math.round(v*1e6)/1e6),indices,width:data.width/data.units,height:1.5};
}
await fs.writeFile('public/assets/road-story/text-meshes.json',JSON.stringify(result));
