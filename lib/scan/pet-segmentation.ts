import * as ort from 'onnxruntime-web/wasm';

/** Pixel segmentation only. No pixel value is a physical measurement. */
export type PetSegmentation = {
  width: number; height: number;
  /** Model-grid binary pet mask, 0/1, only within the actual image area. */
  mask: Uint8Array;
  labels: Int32Array;
  /** Model scores, NOT calibrated accuracy or fit confidence. */
  petProbability: Float32Array;
  gridSize: 512;
  resizedWidth: number; resizedHeight: number;
  offsetX: number; offsetY: number;
  dogPixels: number; catPixels: number;
  /** Original-image pixels, exclusive max; includes fur and visible body only. */
  bounds: {left:number;top:number;right:number;bottom:number}|null;
  touchesImageEdge: boolean;
};

type Source = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export async function createPetSegmenter(modelUrl: string, wasmBaseUrl?: string) {
  // Single-thread WASM also works on GitHub Pages without cross-origin isolation.
  ort.env.wasm.numThreads = 1;
  if (wasmBaseUrl) ort.env.wasm.wasmPaths = wasmBaseUrl;
  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm'], graphOptimizationLevel: 'all',
  });
  return {
    async segment(source: Source): Promise<PetSegmentation> {
      const width = source instanceof HTMLVideoElement ? source.videoWidth :
        source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const height = source instanceof HTMLVideoElement ? source.videoHeight :
        source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      if (!width || !height) throw new Error('The image or video frame is not ready.');
      const ratio = Math.min(512 / width, 512 / height);
      const resizedWidth = Math.max(1, Math.round(width * ratio));
      const resizedHeight = Math.max(1, Math.round(height * ratio));
      const offsetX = Math.floor((512 - resizedWidth) / 2);
      const offsetY = Math.floor((512 - resizedHeight) / 2);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d', {willReadFrequently:true});
      if (!context) throw new Error('Image processing is unavailable in this browser.');
      context.fillStyle = 'rgb(124,116,104)';
      context.fillRect(0,0,512,512);
      context.drawImage(source,offsetX,offsetY,resizedWidth,resizedHeight);
      const rgba = context.getImageData(0,0,512,512).data;
      const pixels = 512*512;
      const input = new Float32Array(3*pixels);
      for (let i=0;i<pixels;i++) {
        input[i] = (rgba[i*4]/255-.485)/.229;
        input[pixels+i] = (rgba[i*4+1]/255-.456)/.224;
        input[pixels*2+i] = (rgba[i*4+2]/255-.406)/.225;
      }
      const tensor = new ort.Tensor('float32',input,[1,3,512,512]);
      let tensors: ort.InferenceSession.OnnxValueMapType | undefined;
      try {
        tensors = await session.run({image:tensor});
        // Copy out before releasing ORT buffers.
        const labels = new Int32Array(tensors.labels.data as Int32Array);
        const petProbability = new Float32Array(tensors.pet_probability.data as Float32Array);
        const mask = new Uint8Array(pixels);
        let dogPixels=0,catPixels=0,minX=512,minY=512,maxX=-1,maxY=-1;
        for(let y=offsetY;y<offsetY+resizedHeight;y++) {
          for(let x=offsetX;x<offsetX+resizedWidth;x++) {
            const i=y*512+x;
            if(labels[i]!==8 && labels[i]!==12) continue;
            mask[i]=1;
            if(labels[i]===12) dogPixels++; else catPixels++;
            minX=Math.min(minX,x);minY=Math.min(minY,y);
            maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
          }
        }
        return {width,height,mask,labels,petProbability,gridSize:512,
          resizedWidth,resizedHeight,offsetX,offsetY,dogPixels,catPixels,
          bounds:maxX<0 ? null : {
            left:(minX-offsetX)*width/resizedWidth,
            top:(minY-offsetY)*height/resizedHeight,
            right:(maxX+1-offsetX)*width/resizedWidth,
            bottom:(maxY+1-offsetY)*height/resizedHeight,
          },
          touchesImageEdge:maxX>=0 && (minX===offsetX || minY===offsetY ||
            maxX===offsetX+resizedWidth-1 || maxY===offsetY+resizedHeight-1),
        };
      } finally {
        tensor.dispose();
        if(tensors) for(const value of Object.values(tensors)) {
          if(value instanceof ort.Tensor) value.dispose();
        }
      }
    },
    async dispose() { await session.release(); },
  };
}

/** Convert the model-grid binary mask into original-image pixels if needed. */
export function originalPetMask(result:PetSegmentation):Uint8Array {
  const {width,height,resizedWidth,resizedHeight,offsetX,offsetY,mask}=result;
  const original = new Uint8Array(width*height);
  for(let y=0;y<height;y++) {
    const sy=offsetY+Math.min(resizedHeight-1,Math.floor((y+.5)*resizedHeight/height));
    for(let x=0;x<width;x++) {
      const sx=offsetX+Math.min(resizedWidth-1,Math.floor((x+.5)*resizedWidth/width));
      original[y*width+x]=mask[sy*512+sx];
    }
  }
  return original;
}
