from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[2];ms=json.loads((r/'public/assets/road-story/text-meshes.json').read_text());results=[]
for t,m in ms.items():
 S=256;W=round(m['width']*S)+64;H=400;base=310
 im=Image.new('L',(W,H));d=ImageDraw.Draw(im);p=np.array(m['positions']).reshape(-1,3)
 for f in np.array(m['indices']).reshape(-1,3):d.polygon([(32+p[k,0]*S,base-p[k,1]*S) for k in f],fill=255)
 path=r/'public/assets/road-story'/('date-mono.ttf' if t.isascii() else 'title.woff');f=TTFont(path);cmap=f.getBestCmap();units=f['head'].unitsPerEm
 ref=Image.new('L',(W,H));draw=ImageDraw.Draw(ref);pilfont=ImageFont.truetype(str(path),S);x=32
 for ch in t:
  draw.text((x,base),ch,font=pilfont,anchor='ls',fill=255);x+=f['hmtx'][cmap[ord(ch)]][0]/units*S

 a=np.array(im)>127;b=np.array(ref)>127;iou=np.logical_and(a,b).sum()/np.logical_or(a,b).sum();results.append({'text':t,'iou':float(iou)});assert iou>.92,(t,iou)
 if t=='2n工会成立':
  panel=Image.new('RGB',(W,800),(6,9,13));panel.paste(ref,(0,0));panel.paste(im,(0,400));panel.save(r/'scripts/road-story/cache/font-reference-check.png')
(r/'scripts/road-story/cache/font-verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print({'strings':len(results),'minimum_iou':min(v['iou'] for v in results)})
