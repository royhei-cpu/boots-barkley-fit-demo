/** Local ImageNet appearance classification for rough adult-size priors.
 * Model scores are not accuracy, breed identification, age, or physical scale.
 * See PROVENANCE.md. A supported pet segmentation is required by the caller.
 */
export const SIZE_GROUPS = ['toy', 'small', 'medium', 'large', 'giant', 'cat'];
// Deliberately coarse adult-weight bins. These are application bins, not AKC categories.
// Breeds spanning multiple sizes (Mexican hairless, Eskimo dog) are unsupported.
const indices = {
  toy: [151,153,157,158,187,201,237,252,259,265],
  small: [152,154,155,156,171,181,182,185,186,188,189,190,192,193,194,195,196,199,203,204,223,230,254,262,266],
  medium: [162,172,173,174,179,183,184,198,200,202,211,215,217,218,219,220,221,227,232,240,241,245,250,253,261,263,264,267],
  large: [159,160,161,164,165,166,167,168,169,176,178,180,191,197,205,206,207,208,209,210,212,213,214,216,224,225,226,229,231,233,235,236,239,242,249,251,258,260],
  giant: [163,170,175,177,222,228,234,238,243,244,246,247,255,256,257],
  cat: [281,282,283,284,285],
};
const groupsByIndex = new Map(Object.entries(indices).flatMap(([group, ids]) => ids.map(id => [id, group])));

/** Metadata is supplied separately to avoid JSON module compatibility issues. */
export function classifyPetLogits(logits, labels = []) {
  const rejected = reason => ({accepted:false,group:null,label:'Uncertain pet appearance',species:'unknown',candidates:[],petScore:0,groupScore:0,groupWeights:{},reason});
  if (!logits || logits.length !== 1000 || Array.from(logits).some(x => !Number.isFinite(x))) return rejected('The classifier output is invalid.');
  const max = Math.max(...logits), scores = Array.from(logits, x => Math.exp(x-max));
  const total = scores.reduce((a,b)=>a+b,0); scores.forEach((v,i)=>scores[i]=v/total);
  const groupScores = Object.fromEntries(SIZE_GROUPS.map(g=>[g,0]));
  let dogScore=0,catScore=0;
  for (let i=0;i<1000;i++) {
    if (i>=151 && i<=268) dogScore+=scores[i];
    if (i>=281 && i<=285) catScore+=scores[i];
    const group=groupsByIndex.get(i); if(group) groupScores[group]+=scores[i];
  }
  const petScore=dogScore+catScore;
  const species=dogScore>=catScore?'dog':'cat';
  const speciesScore=species==='dog'?dogScore:catScore;
  const ranked=Array.from({length:1000},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]);
  const candidates=ranked.slice(0,10).map(index=>({index,label:labels[index]??`ImageNet class ${index}`,group:groupsByIndex.get(index)??null,species:index>=151&&index<=268?'dog':index>=281&&index<=285?'cat':'unknown',score:scores[index]}));
  const ordered=Object.entries(groupScores).filter(([g])=>species==='cat'?g==='cat':g!=='cat').sort((a,b)=>b[1]-a[1]);
  const supported=ordered.reduce((a,[,v])=>a+v,0);
  const [best,second]=ordered;
  const share=best[1]/Math.max(supported,1e-10);
  const base={accepted:false,group:null,label:'Uncertain pet appearance',species,candidates,petScore,groupScore:share,groupScores,groupWeights:{},reason:''};
  if(petScore<.40 || speciesScore/petScore<.85 || supported/speciesScore<.80 || candidates[0].species!==species) return {...base,reason:'Pet appearance is unclear. Try one unobstructed photo of the whole pet.'};
  let selected=[best];
  if(share<.75) {
    // User explicitly accepts a rough starting estimate, including uncertain
    // size candidates. Blend plausible adult priors; do not choose one breed.
    let cumulative=best[1];
    for(const entry of ordered.slice(1)) {
      selected.push(entry);cumulative+=entry[1];if(cumulative/supported>=.85)break;
    }
  }
  const selectedTotal=selected.reduce((a,[,v])=>a+v,0);
  const groupWeights=Object.fromEntries(selected.map(([g,v])=>[g,v/selectedTotal]));
  const selectedNames=selected.map(([g])=>g).sort((a,b)=>SIZE_GROUPS.indexOf(a)-SIZE_GROUPS.indexOf(b));
  const label=species==='cat'?'Cat-like appearance':`${selectedNames.length>1?selectedNames[0]+' to '+selectedNames.at(-1):selectedNames[0]} adult build`;
  const uncertainSize=selected.length>1;
  return {...base,accepted:true,group:best[0],label:label[0].toUpperCase()+label.slice(1),groupWeights,uncertainSize,uncertainty:uncertainSize?'high':'unvalidated',reason:uncertainSize?'Visual candidates suggest different sizes. This blends typical adult-size priors into a very rough starting estimate; check and edit it.':'Rough visual prediction using typical adult size priors. Breed, age, and physical dimensions are not measured.'};
}

function filterWeights(start, inputSize, outputSize, count=224) {
  const scale=inputSize/outputSize, support=Math.max(1,scale);
  return Array.from({length:count},(_,i)=>{
    const center=(start+i+.5)*scale-.5, first=Math.max(0,Math.ceil(center-support)),last=Math.min(inputSize-1,Math.floor(center+support));
    const taps=[];let sum=0;
    for(let j=first;j<=last;j++){const w=Math.max(0,1-Math.abs(j-center)/support);if(w>0){taps.push([j,w]);sum+=w;}}
    return taps.map(([j,w])=>[j,w/sum]);
  });
}
/** RGB RGBA ImageData -> official resize-short-edge232 / center224 / normalize.
 * Pure-JS antialiased bilinear resampling keeps the same behavior in browser/Node.
 * Optional bbox is XYXY, with ten percent context padding before preprocessing.
 */
export function prepareClassifierInput(imageData,bbox=null) {
  const {width,height,data}=imageData;
  if(width<1||height<1||data.length!==width*height*4)throw new Error('Invalid RGBA input');
  let x0=0,y0=0,w=width,h=height;
  if(bbox){
    if(bbox.length!==4||bbox.some(v=>!Number.isFinite(v))||bbox[2]<=bbox[0]||bbox[3]<=bbox[1])throw new Error('Invalid pet crop');
    const px=(bbox[2]-bbox[0])*.10,py=(bbox[3]-bbox[1])*.10;
    x0=Math.max(0,Math.floor(bbox[0]-px));y0=Math.max(0,Math.floor(bbox[1]-py));
    w=Math.min(width,Math.ceil(bbox[2]+px))-x0;h=Math.min(height,Math.ceil(bbox[3]+py))-y0;
    if(w<1||h<1)throw new Error('Pet crop is outside the image');
  }
  const rw=w<h?232:Math.floor(w/h*232),rh=h<w?232:Math.floor(h/w*232);
  // Python round ties-to-even, as used by torchvision CenterCrop.
  const roundEven=x=>Math.floor(x)+(x%1>.5||(x%1===.5&&Math.floor(x)%2)?1:0);
  const cx=roundEven((rw-224)/2),cy=roundEven((rh-224)/2);
  const xWeights=filterWeights(cx,w,rw),yWeights=filterWeights(cy,h,rh);
  const rows=new Map(),batch=new Float32Array(3*224*224),mean=[.485,.456,.406],std=[.229,.224,.225];
  for(let y=0;y<224;y++) {
    for(const [iy] of yWeights[y]) if(!rows.has(iy)) {
      const row=new Uint8Array(224*3);
      for(let x=0;x<224;x++)for(let c=0;c<3;c++){
        let value=0;for(const [ix,weight]of xWeights[x])value+=data[((iy+y0)*width+ix+x0)*4+c]*weight;
        row[x*3+c]=Math.round(value);
      }
      rows.set(iy,row);
    }
    for(let x=0;x<224;x++)for(let c=0;c<3;c++){
      let value=0;for(const [iy,weight]of yWeights[y])value+=rows.get(iy)[x*3+c]*weight;
      batch[c*224*224+y*224+x]=(Math.round(value)/255-mean[c])/std[c];
    }
  }
  return {data:batch,dims:[1,3,224,224],crop:[x0,y0,x0+w,y0+h]};
}
export async function inferPetAppearance({ort,session,imageData,bbox=null,labels=[]}) {
  const input=prepareClassifierInput(imageData,bbox);
  const outputs=await session.run({image:new ort.Tensor('float32',input.data,input.dims)});
  const result=classifyPetLogits(outputs.logits.data,labels);
  return {...result,crop:input.crop,model:'MobileNetV3-Large ImageNet1K V2',scoreMeaning:'Uncalibrated model scores; not measurement accuracy'};
}
