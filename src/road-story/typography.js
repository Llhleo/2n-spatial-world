// Authored in the portrait scene's 864 × 1872 reference frame. Break after
// semantic phrases, preserving the approved source string and its spaces.
const bodyEnds=[
 ['世界里，','名字。','相遇，','约定。'],
 ['历程','刻度。','倒下','延续；','一段','记忆。'],
 ['公会','象征，','日子，','印记。']
];
const paragraphRows=[[2],[2,4],[2]];
export function roadTextParts(record,kind){
 const layout=[
  {x:90,y:360,title:84,titles:[record.title]},
  {x:60,y:330,title:80,titles:['2n工会','首次血祭']},
  {x:150,y:570,title:78,titles:['2n工会首个','unique等级花瓣']}
 ][kind];
 const parts=[{text:record.date.replaceAll('-','.'),size:44,x:layout.x,y:layout.y,color:0xe7ece8,role:'date'}];
 layout.titles.forEach((text,i)=>parts.push({text,size:layout.title,x:layout.x,y:layout.y+92+i*96,color:0xe8eee9,role:'title'}));
 let offset=0,paragraphGap=0;
 bodyEnds[kind].forEach((end,line)=>{
  const match=record.body.indexOf(end,offset);if(match<0)throw new Error('History copy changed; recompose the road body before publication');
  const next=match+end.length,text=record.body.slice(offset,next);offset=next;
  if(paragraphRows[kind].includes(line))paragraphGap+=22;
  parts.push({text,size:32,x:layout.x,y:layout.y+92+layout.titles.length*96+32+line*51+paragraphGap,color:0xc5ceca,role:'body'});
 });
 if(offset!==record.body.length)throw new Error('Road body contains uncomposed copy');
 return parts;
}
