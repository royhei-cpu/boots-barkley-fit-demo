export type CostumeOverlay = {kind:'body'|'head'|'wings'; path:string};

// Garment-only illustrations derived from each corresponding catalog photograph.
// A supported appearance is separate from eligibility for a size recommendation.
export const costumeOverlays:Record<string,CostumeOverlay> = Object.fromEntries([
  'hot-dog','pumpkin','chicken','highland-cow','bat-wings','lion',
  '1011934287','1011934293','1011934245','1011934069','cat-glitter-wings',
].map(id=>[id,{kind:id==='lion'?'head':id.includes('wings')?'wings':'body',path:`/images/try-on-overlays/${id}.webp`}])) as Record<string,CostumeOverlay>;

export type TryOnAdjustment={x:number;y:number;scale:number;height:number;rotation:number;flip:boolean};
export const defaultAdjustment=():TryOnAdjustment=>({x:0,y:0,scale:1,height:1,rotation:0,flip:false});
