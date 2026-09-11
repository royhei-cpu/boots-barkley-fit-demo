export type SizeGroup = 'toy'|'small'|'medium'|'large'|'giant'|'cat';
export type Species = 'dog'|'cat'|'unknown';
export type ClassifierCandidate = {index:number;label:string;group:SizeGroup|null;species:Species;score:number};
export type AppearancePrediction = {
  accepted:boolean;group:SizeGroup|null;label:string;species:Species;
  candidates:ClassifierCandidate[];petScore:number;groupScore:number;
  groupWeights:Partial<Record<SizeGroup,number>>;
  groupScores?:Partial<Record<SizeGroup,number>>;reason:string;
  crop?:number[];model?:string;scoreMeaning?:string;
  uncertainSize?:boolean;uncertainty?:'high'|'unvalidated';
};
export const SIZE_GROUPS:SizeGroup[];
export function classifyPetLogits(logits:ArrayLike<number>,labels?:string[]):AppearancePrediction;
export function prepareClassifierInput(imageData:{width:number;height:number;data:Uint8ClampedArray},bbox?:number[]|null):{data:Float32Array;dims:number[];crop:number[]};
export function inferPetAppearance(args:{ort:any;session:any;imageData:{width:number;height:number;data:Uint8ClampedArray};bbox?:number[]|null;labels?:string[]}):Promise<AppearancePrediction>;
