from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'.fontdeps'))
from shapely.geometry import LineString
from shapely.ops import unary_union,polygonize
source=json.loads((root/'scripts/road-story/cache/text-outlines.json').read_text())
def winding(p,ring):
 x,y=p;n=0
 for a,b in zip(ring,ring[1:]+ring[:1]):
  cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1])
  if a[1]<=y<b[1] and cross>0:n+=1
  if b[1]<=y<a[1] and cross<0:n-=1
 return n
for data in source.values():
 for glyph in data['glyphs']:
  rings=glyph['rings'];network=unary_union([LineString(r+[r[0]]) for r in rings]);faces=list(polygonize(network));ink=[]
  for face in faces:
   p=face.representative_point()
   if sum(winding((p.x,p.y),r) for r in rings)!=0:ink.append(face)
  merged=unary_union(ink);polygons=list(merged.geoms) if hasattr(merged,'geoms') else [merged]
  glyph['parts']=[{'outer':list(p.exterior.coords)[:-1],'holes':[list(r.coords)[:-1] for r in p.interiors]} for p in polygons if not p.is_empty]
(root/'scripts/road-story/cache/text-resolved.json').write_text(json.dumps(source,ensure_ascii=False))
