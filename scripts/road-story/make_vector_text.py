from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
import json
root=Path(__file__).resolve().parents[2]
font=None;glyphs=None;cmap=None;units=None
class Flatten(BasePen):
    def __init__(self):super().__init__(glyphs);self.rings=[];self.points=[]
    def _moveTo(self,p):self.points=[list(p)]
    def _lineTo(self,p):self.points.append(list(p))
    def _curveToOne(self,a,b,c):
        p=self._getCurrentPoint()
        for i in range(1,13):
            t=i/12;u=1-t;self.points.append([u**3*p[k]+3*u*u*t*a[k]+3*u*t*t*b[k]+t**3*c[k] for k in range(2)])
    def _qCurveToOne(self,a,b):
        p=self._getCurrentPoint()
        for i in range(1,9):
            t=i/8;u=1-t;self.points.append([u*u*p[k]+2*u*t*a[k]+t*t*b[k] for k in range(2)])
    def _closePath(self):
        if len(self.points)>2:self.rings.append(self.points)
        self.points=[]
    def _endPath(self):self._closePath()
texts={}
records=json.loads((root/'content/history.json').read_text())['events']
strings=[]
for record in records:
    strings.extend([record['date'].replace('-','.'),record['title']])
    strings.extend([record['body'][i:i+18] for i in range(0,len(record['body']),18)])
strings.extend(['2n工会首个','unique等级花瓣'])
(root/'scripts/road-story/cache').mkdir(exist_ok=True)
for text in strings:
    font=TTFont(root/'public/assets/road-story'/ ('date-mono.ttf' if text.isascii() else 'title.woff'));glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
    x=0;items=[]
    for ch in text:
        name=cmap[ord(ch)];pen=Flatten();glyphs[name].draw(pen);items.append({'x':x,'rings':pen.rings});x+=font['hmtx'][name][0]
    texts[text]={'glyphs':items,'width':x,'units':units}
(root/'scripts/road-story/cache/text-outlines.json').write_text(json.dumps(texts,ensure_ascii=False))
print('source font weight',font['OS/2'].usWeightClass)
