// Authored in the portrait scene's 864 × 1872 reference frame. The narrowing
// second body follows the open wedge beside the crossing foreground road.
export function roadTextParts(record,kind){
 const layout=[
  {x:90,y:360,title:84,widths:[15,14,12,12],titles:[record.title]},
  {x:90,y:110,title:80,widths:[13,13,12,11,10,10],titles:['2n工会','首次血祭']},
  {x:150,y:570,title:78,widths:[15,14,13],titles:['2n工会首个','unique等级花瓣']}
 ][kind];
 const parts=[{text:record.date.replaceAll('-','.'),size:44,x:layout.x,y:layout.y,color:0xe7ece8,role:'date'}];
 layout.titles.forEach((text,i)=>parts.push({text,size:layout.title,x:layout.x,y:layout.y+92+i*96,color:0xe8eee9,role:'title'}));
 let offset=0,line=0;
 while(offset<record.body.length){const width=layout.widths[Math.min(line,layout.widths.length-1)],text=record.body.slice(offset,offset+width);parts.push({text,size:36,x:layout.x,y:layout.y+92+layout.titles.length*96+28+line*50,color:0xbdcbc7,role:'body'});offset+=width;line++;}
 return parts;
}
