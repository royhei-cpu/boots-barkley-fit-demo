import type * as Ort from 'onnxruntime-web/wasm';
export const AP10K_NAMES: readonly string[];
export const AP10K_LINKS: readonly (readonly number[])[];
export type PosePoint = {
  id:number;name:string;x:number;y:number;normalizedX:number;normalizedY:number;
  response:number;responseX:number;responseY:number;insideImage:boolean;validResponse:boolean;
};
export type PoseTransform={centerX:number;centerY:number;side:number;width:number;height:number;bbox:number[]};
export function preparePoseInput(imageData:{width:number;height:number;data:Uint8ClampedArray},box?:number[]):{
  data:Float32Array;dims:number[];transform:PoseTransform;
};
export function decodePoseOutputs(simccX:Float32Array,simccY:Float32Array,transform:PoseTransform):PosePoint[];
export function inferAnimalPose(args:{ort:typeof Ort;session:Ort.InferenceSession;imageData:ImageData;bbox?:number[]}):Promise<{
  keypoints:PosePoint[];transform:PoseTransform;units:'pixels';caveat:string;
}>;
