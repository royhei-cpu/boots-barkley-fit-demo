/** Keep an actual connected silhouette; do not fill gates/occlusion with invented anatomy. */
export function largestPetComponent(source:Uint8Array,width:number,height:number) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||source.length!==width*height)
    throw new Error('Invalid pet mask dimensions.');
  const labels=new Uint32Array(source.length);
  const queue=new Uint32Array(source.length);
  const components:Array<{id:number;size:number;left:number;top:number;right:number;bottom:number}>=[];
  let nextId=0;
  for(let start=0;start<source.length;start++) {
    if(!source[start] || labels[start]) continue;
    const id=++nextId;
    let head=0,tail=0,left=width,top=height,right=-1,bottom=-1;
    queue[tail++]=start;labels[start]=id;
    while(head<tail) {
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        if((dx===0&&dy===0)||x+dx<0||y+dy<0||x+dx>=width||y+dy>=height)continue;
        const neighbor=(y+dy)*width+x+dx;
        if(source[neighbor]&&!labels[neighbor]) {labels[neighbor]=id;queue[tail++]=neighbor;}
      }
    }
    components.push({id,size:tail,left,top,right:right+1,bottom:bottom+1});
  }
  components.sort((a,b)=>b.size-a.size);
  const largest=components[0];
  const mask=new Uint8Array(source.length);
  if(largest)for(let i=0;i<source.length;i++)if(labels[i]===largest.id)mask[i]=1;
  const minimumMeaningful=Math.max(48,source.length*.003,(largest?.size??0)*.12);
  const meaningful=components.filter(c=>c.size>=minimumMeaningful);
  return {mask,componentCount:components.length,meaningfulComponents:meaningful.length,
    petPixels:largest?.size??0,bounds:largest?{left:largest.left,top:largest.top,right:largest.right,bottom:largest.bottom}:null,
    touchesImageEdge:!!largest&&(largest.left===0||largest.top===0||largest.right===width||largest.bottom===height),
  };
}
