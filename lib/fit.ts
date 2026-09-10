import expanded from './expanded-catalog.json';
import verifiedItemSizes from './verified-item-sizes.json';
export type Species = 'dog' | 'cat';
export type Sample = 'dog' | 'collie' | 'corgi' | 'cat';
export type Dimension = 'chest' | 'neck' | 'back' | 'head';
export type Measures = Record<Dimension, number>;
export type Mode = 'published';
export type Range = [number, number];
export type SizeSpec = { size: string; chest?: Range; neck?: Range; back?: Range; head?: Range; length?: number; species?: Species[]; url?: string };
export type Product = { id: string; name: string; category: string; note: string; species: Species[]; color: string; fields: Dimension[]; grouped?: boolean; conflict?: boolean; actual?: SizeSpec[]; sizingPending?: boolean; brand?: string };
export const chart: SizeSpec[] = [
 {size:'XS',neck:[8,11],chest:[11,16],length:10,head:[8,12]},
 {size:'S',neck:[10,16],chest:[16,23],length:14,head:[12,16]},
 {size:'M',neck:[14,20],chest:[20,28],length:18,head:[16,20]},
 {size:'L',neck:[18,24],chest:[26,35],length:22,head:[20,24]},
 {size:'XL',neck:[22,28],chest:[32,40],length:24,head:[24,28]},
 {size:'XXL',neck:[26,34],chest:[38,45],length:26,head:[26,30]},
];
export const products: Product[] = [
 {id:'highland-cow',name:'Highland cow costume',category:'BIG LITTLE PERSONALITY',note:'Item specifications are used. Shared chart garment lengths differ from overall length; supplier confirmation needed.',species:['dog','cat'],color:'#efe5d8',fields:['chest','neck','back'],actual:[{size:'XS',neck:[7,12],chest:[10,13],length:12,url:'https://www.target.com/p/-/A-94237128'},{size:'S',neck:[11,15],chest:[13,19],length:15,url:'https://www.target.com/p/-/A-94237136'}]},
 {id:'pumpkin',name:'Pumpkin hoodie',category:'THE FALL CLASSIC',note:'Check hood opening, front-leg clearance and comfortable movement.',species:['dog','cat'],color:'#ffe6d3',fields:['chest','neck','back']},
 {id:'hot-dog',name:'Hot dog costume',category:'GOOD ENOUGH TO EAT',note:'Individual item specifications are used here. The shared chart differs; confirm the source with the supplier. Check panel clearance and closures.',species:['dog','cat'],color:'#fff1c8',fields:['chest','neck','back'],actual:[{size:'S',neck:[10,16],chest:[16,26],length:14.82,url:'https://www.target.com/p/-/A-90479751'},{size:'M',neck:[14,20],chest:[20,28],length:21,url:'https://www.target.com/p/-/A-90479750'},{size:'L',neck:[18,24],chest:[26,35],length:18.7,species:['dog'],url:'https://www.target.com/p/-/A-90479757'}]},
 {id:'chicken',name:'Chicken costume',category:'A LITTLE FOWL PLAY',note:'Headpiece fit and front-leg clearance need a separate check.',species:['dog','cat'],color:'#f4efd7',fields:['chest','neck','back','head']},
 {id:'bat-wings',name:'Reflective bat wings',category:'AFTER-DARK ENERGY',note:'Check the exact variant’s species, closure adjustment and wing clearance.',species:['dog','cat'],color:'#e9e1f6',fields:['chest','neck'],grouped:true},
 {id:'shopping-cart',name:'Target shopping cart',category:'THE LITTLE ERRAND BUDDY',note:'Public L specifications conflict with the embedded chart. Supplier verification is required.',species:['dog','cat'],color:'#fce2e5',fields:['chest','neck','back'],conflict:true},
 {id:'lion',name:'Lion headwear',category:'A LITTLE MAIN CHARACTER',note:'Check ears, face opening and closure. Keep eyes and whiskers clear.',species:['dog','cat'],color:'#f6e6c8',fields:['head'],grouped:true},
 {id:'cat-glitter-wings',name:'Glitter wings for cats',category:'A LITTLE NIGHT MAGIC',note:'Published chest and neck ranges match only; check the 9.75 in accessory length and movement.',species:['cat'],color:'#e7e2f3',fields:['chest','neck'],actual:[{size:'One listed fit',neck:[8,16],chest:[11,23],length:9.75}]},
];
const extraProducts:Product[]=expanded.map(p=>({id:p.id,name:p.name.split(' - ')[0].replace(/Halloween /g,'').replace(/ Dog and Cat /g,' ').replace(/ Dog Pet /g,' ').replace(/ Dog /g,' ').replace(/ Cat /g,' cat ').replace(/Full Body /g,'').replace(/Pet /g,''),category:'FROM THE TARGET COLLECTION',note:'Supplier-approved size measurements are needed before recommending this style. Check the exact variant on Target.',species:p.species as Species[],color:p.species.length>1?'#e9e1f6':p.species[0]==='cat'?'#dceef7':'#e4efd6',fields:/Head|Headpiece|Headwear|Headware/i.test(p.name)?['head']:/Wings|Rider|Accessories/i.test(p.name)?['chest','neck']:['chest','neck','back'],sizingPending:true,brand:p.brand}));
products.push(...extraProducts);
for (const verified of verifiedItemSizes) {
 const product=products.find(p=>p.id===verified.id);
 if(product) {
  product.actual=verified.sizes as SizeSpec[];
  product.sizingPending=false;
  product.note=verified.note;
 }
}
const groups: SizeSpec[] = [
 {size:'XXS/XS',neck:[10,14],chest:[11,20],head:[8,12],length:11},
 {size:'S/M',neck:[10,20],chest:[16,28],head:[12,20],length:16.5},
 {size:'L/XL',neck:[18,28],chest:[26,40],head:[20,28],length:22.5},
];
export const sampleProfiles: Record<Sample,{name:string; measures:Measures}> = {
 dog:{name:'Bullseye',measures:{chest:24,neck:17,back:17,head:17}},
 corgi:{name:'Pip',measures:{chest:19,neck:13,back:16,head:13}},
 collie:{name:'Scout',measures:{chest:30,neck:21,back:22,head:23}},
 cat:{name:'Cleo',measures:{chest:12,neck:9,back:11,head:10}},
};
export function validate(m:Measures) { return ['chest','neck','back'].every(k => Number.isFinite(m[k as Dimension]) && m[k as Dimension]>=3 && m[k as Dimension]<=65) && (m.head===0 || (Number.isFinite(m.head) && m.head>=3 && m.head<=45)); }
export function sizesFor(p:Product, _mode:Mode): SizeSpec[] { return p.actual??(p.grouped?groups:chart); }
export type Check = {field:Dimension; value:number; range:Range; pass:boolean; reason:string};
export type Evaluation = {spec:SizeSpec; checks:Check[]; pass:boolean; score:number; missing:boolean; near:boolean};
export function evaluate(p:Product,m:Measures,mode:Mode,species?:Species):Evaluation[] {
 if(p.sizingPending || (species&&!p.species.includes(species)))return [];
 return sizesFor(p,mode).filter(s=>!species||!s.species||s.species.includes(species)).map(spec=>{
  const fields=p.fields.filter(f=>f!=='back');
  const checks=fields.filter(f=>spec[f]).map(field=>{
   const range=spec[field] as Range,value=m[field],pass=value>0&&value>=range[0]&&value<=range[1];
   const reason=!value?'Measurement needed':value<range[0]?'Below fit range':value>range[1]?'Above fit range':'Within fit range';
   return {field,value,range,pass,reason};
  });
  const missing=checks.some(c=>!c.value);
  const pass=checks.length>0&&checks.every(c=>c.pass)&&!missing;
  const score=checks.reduce((a,c)=>a+Math.abs(c.value-(c.range[0]+c.range[1])/2)/(c.range[1]-c.range[0]),0);
  const near=pass&&checks.some(c=>Math.min(c.value-c.range[0],c.range[1]-c.value)<=0.5);
  return {spec,checks,pass,score,missing,near};
 });
}
export function match(p:Product,m:Measures,mode:Mode,species?:Species) {return evaluate(p,m,mode,species).filter(e=>e.pass).sort((a,b)=>a.score-b.score)[0];}
export const fieldLabels:Record<Dimension,string>={chest:'Chest girth',neck:'Neck',back:'Back length',head:'Head circumference'};
export const fieldHelp:Record<Dimension,string>={chest:'Around the widest chest, just behind the front legs.',neck:'Around the collar position. Keep the tape comfortable, not tight.',back:'Base of neck to base of tail, while standing naturally.',head:'Around the head where a headpiece sits. Needed for headwear.'};
