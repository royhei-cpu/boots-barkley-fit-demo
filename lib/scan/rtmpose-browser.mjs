/**
 * Local browser preprocessing/decoding for OpenMMLab RTMPose-m AP10K.
 * Model: input float32 [1,3,256,256], simcc_x/simcc_y [1,17,512].
 * This code does not infer physical units, circumference, or garment fit.
 * Published algorithm: MMPose, Apache-2.0. See PROVENANCE.md in this folder.
 * Bilinear coefficients are quantized to 1/32 as in OpenCV INTER_LINEAR.
 * Small numerical differences can remain at affine rounding boundaries.
 */
export const AP10K_NAMES = Object.freeze([
  'left_eye', 'right_eye', 'nose', 'neck', 'root_of_tail',
  'left_shoulder', 'left_elbow', 'left_front_paw',
  'right_shoulder', 'right_elbow', 'right_front_paw',
  'left_hip', 'left_knee', 'left_back_paw',
  'right_hip', 'right_knee', 'right_back_paw',
]);
export const AP10K_LINKS = Object.freeze([
  [0, 1], [0, 2], [1, 2], [2, 3], [3, 4],
  [3, 5], [5, 6], [6, 7], [3, 8], [8, 9], [9, 10],
  [4, 11], [11, 12], [12, 13], [4, 14], [14, 15], [15, 16],
]);
const SIZE = 256;
const MEAN = [123.675, 116.28, 103.53];
const STD = [58.395, 57.12, 57.375];

/** imageData is an EXIF-oriented ImageData-like {width,height,data RGBA}. */
export function preparePoseInput(imageData, box) {
  const {width, height, data} = imageData;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || data.length !== width * height * 4) {
    throw new Error('Invalid oriented RGBA image');
  }
  const bbox = box ? [...box] : [0, 0, width, height];
  if (bbox.length !== 4 || !bbox.every(Number.isFinite) || bbox[2] <= bbox[0] || bbox[3] <= bbox[1]) {
    throw new Error('Invalid pet bounding box');
  }
  const centerX = (bbox[0] + bbox[2]) / 2;
  const centerY = (bbox[1] + bbox[3]) / 2;
  const side = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 1.25;
  const originX = centerX - side / 2;
  const originY = centerY - side / 2;
  const tensor = new Float32Array(3 * SIZE * SIZE);
  const pixel = (x, y, channel) => (x < 0 || y < 0 || x >= width || y >= height) ? 0 : data[(y * width + x) * 4 + channel];
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.round((originY + y * side / SIZE) * 32) / 32;
    const y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.round((originX + x * side / SIZE) * 32) / 32;
      const x0 = Math.floor(sx), fx = sx - x0;
      for (let c = 0; c < 3; c++) {
        const value = (pixel(x0, y0, c) * (1 - fx) + pixel(x0 + 1, y0, c) * fx) * (1 - fy)
          + (pixel(x0, y0 + 1, c) * (1 - fx) + pixel(x0 + 1, y0 + 1, c) * fx) * fy;
        tensor[c * SIZE * SIZE + y * SIZE + x] = (Math.round(value) - MEAN[c]) / STD[c];
      }
    }
  }
  return {data: tensor, dims: [1, 3, SIZE, SIZE], transform: {centerX, centerY, side, width, height, bbox}};
}

export function decodePoseOutputs(simccX, simccY, transform) {
  if (!simccX || !simccY || simccX.length !== 17 * 512 || simccY.length !== 17 * 512) {
    throw new Error('Unexpected AP10K SimCC outputs');
  }
  const {centerX, centerY, side, width, height} = transform;
  return AP10K_NAMES.map((name, id) => {
    let ix = 0, iy = 0, peakX = -Infinity, peakY = -Infinity;
    for (let i = 0; i < 512; i++) {
      const x = simccX[id * 512 + i], y = simccY[id * 512 + i];
      if (x > peakX) {peakX = x; ix = i;}
      if (y > peakY) {peakY = y; iy = i;}
    }
    const x = ix / 2 / SIZE * side + centerX - side / 2;
    const y = iy / 2 / SIZE * side + centerY - side / 2;
    const response = Math.min(peakX, peakY);
    return {
      id, name, x, y, normalizedX: x / width, normalizedY: y / height,
      response, responseX: peakX, responseY: peakY,
      insideImage: x >= 0 && y >= 0 && x <= width && y <= height,
      validResponse: Number.isFinite(response) && response > 0,
    };
  });
}

/** ort is the imported onnxruntime-web module; session loads local/public ONNX. */
export async function inferAnimalPose({ort, session, imageData, bbox}) {
  const prepared = preparePoseInput(imageData, bbox);
  const tensor = new ort.Tensor('float32', prepared.data, prepared.dims);
  let outputs;
  try {
    outputs = await session.run({input: tensor});
    return {keypoints: decodePoseOutputs(outputs.simcc_x.data, outputs.simcc_y.data, prepared.transform),
      transform: prepared.transform,
      units: 'pixels',
      caveat: '2D model responses are not accuracy probabilities. Physical size and circumference require additional validated geometry.'};
  } finally {
    tensor.dispose?.();
    if (outputs) Object.values(outputs).forEach(output => output.dispose?.());
  }
}
