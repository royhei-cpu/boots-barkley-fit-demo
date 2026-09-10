# Private animal landmark experiment

This folder contains a working local RTMPose-m AP10K ONNX trial on the user's photograph and three video frames. None of those inputs or results was uploaded to an external service or published. All physical measurement fields remain null.

## Sources and licenses

- Official [MMPose RTMPose animal model release](https://github.com/open-mmlab/mmpose/tree/main/projects/rtmpose#animal-2d-17-keypoints): 17 AP10K landmarks, RTMPose-m 256×256, published AP10K AP 72.2. This is pose benchmark performance, not physical measurement accuracy.
- Downloaded weights directly from [OpenMMLab's ONNX release ZIP](https://download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/rtmpose-m_simcc-ap10k_pt-aic-coco_210e-256x256-7a041aa1_20230206.zip).
- [MMPose license](https://github.com/open-mmlab/mmpose/blob/main/LICENSE) and [README license statement](https://github.com/open-mmlab/mmpose/blob/main/README.md#license): Apache-2.0 project. Copy retained as `LICENSE-mmpose.txt`. The release ZIP contains no additional model-specific license file or noncommercial notice.
- [Original AP10K authors' repository](https://github.com/AlexTheBad/AP-10K#license) and [LICENSE](https://github.com/AlexTheBad/AP-10K/blob/main/LICENSE) explicitly declare CC-BY-4.0. Copy retained as `LICENSE-AP10K.txt`. Attribute Hang Yu, Yufei Xu, Jing Zhang, Wei Zhao, Ziyu Guan and Dacheng Tao, “AP-10K: A Benchmark for Animal Pose Estimation in the Wild,” NeurIPS 2021.
- Provenance discrepancy: [MMPose's dataset guide](https://github.com/open-mmlab/mmpose/blob/main/docs/en/dataset_zoo/2d_animal_keypoint.md#ap-10k) contains an inconsistent noncommercial-use sentence. The current originating authors' explicit LICENSE is the stronger source for AP10K's stated license. I did not contact either maintainer; no separate legal clearance was obtained. Code/model publication and upstream data rights should not be conflated.
- [Official model configuration](https://github.com/open-mmlab/mmpose/blob/main/projects/rtmpose/rtmpose/animal_2d_keypoint/rtmpose-m_8xb64-210e_ap10k-256x256.py) specifies RGB conversion, ImageNet normalization and a 256×256 SimCC codec. The code of [rtmlib](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/pose_estimation/rtmpose.py) was inspected as a secondary implementation reference; its repository license is Apache-2.0. Runtime code here does not import rtmlib.
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) supports local browser inference. The actual FP32 and FP16 models both passed ONNX Runtime Web 1.22.0 WASM inference in Node; a real browser test is still required by the integrating application.
- FP16 conversion follows [ONNX Runtime's official guide](https://onnxruntime.ai/docs/performance/model-optimizations/float16.html), using `onnxconverter_common.float16.convert_float_to_float16(..., keep_io_types=True)`.

## Model files

| File | Bytes | SHA256 |
|---|---:|---|
| model.zip | 50,709,303 | 2d75445331cf2f21d6e164430f96ffa765cd874872965ae1736932dda03987f0 |
| model/end2end.onnx | 54,478,120 | 1cfd1c86e0d9e5d5f95178bcd95ee9a4e8386a624cd3c57519f27ff58cac7f28 |
| model/rtmpose-ap10k-fp16.onnx | 27,252,850 | 524027e5ce3a979be2b687e462544a00376610544e53536fa78ced928d7659a6 |

Original weights remain unmodified in `end2end.onnx`. The second ONNX is our FP16 conversion, with input/output tensors retained as FP32. No weights were trained or tuned using the user's media.

## Runnable code

Use `.venv/bin/python run_pose.py /absolute/path/to/image.jpeg`. Repeat with multiple images to share a loaded session. `--bbox x1 y1 x2 y2` accepts an externally detected single-pet bounding box. Without it, the entire image is used and the result explicitly records that single-pet assumption. No animal detector is part of this script.

`run_pose.py` produces JSON, private landmark diagrams, and the actual normalized-crop source. `convert_validate.py` produces FP16 and a four-case numerical comparison. `rtmpose-browser.mjs` exposes `preparePoseInput`, `decodePoseOutputs`, and `inferAnimalPose({ort,session,imageData,bbox})`. `compare-browser-preprocess.mjs` validates typed-array preparation and inverse coordinate mapping.

## Inference contract

- Input name `input`, FP32 NCHW `[1,3,256,256]`, RGB.
- Mean `[123.675,116.28,103.53]`, standard deviation `[58.395,57.12,57.375]` applied to 0–255 channel values.
- Bounding box padded by 1.25, extended to square; affine crop uses black outside the original image.
- Outputs `simcc_x` and `simcc_y`, each `[1,17,512]`. Per-axis argmax index divided by 2 gives model-image coordinates. Inverse affine projects these to the EXIF-oriented source pixels.
- Raw per-axis maxima and min/mean responses are recorded. Values can exceed 1. These are not probabilities or estimated accuracy.
- Keypoint 3 is AP10K neck; keypoint 4 is root of tail. These anatomical annotation targets must not silently be equated with garment tape-measure endpoints.
- The ZIP's `pipeline.json` contains stale 192×256 affine settings. Actual ONNX input shape, published config, and SimCC output lengths consistently require 256×256.

## Actual results and limits

The original 4032×3024 photograph and three 568×320 video frames all produced 17 real model predictions. CPU inference with two threads took approximately 14–19 ms per image after load. Face and torso anchors were visually plausible; hidden front limbs were visibly unreliable. The video's gate and angled body make it unsuitable for direct circumference measurement.

FP16 maximum output drift was 0.00231. Neck, root of tail and shoulders retained the same argmax coordinates in all four cases. One elbow moved 0.5 model pixel in the photo; one hip moved 0.5 model pixel in two video frames. See `fp16-validation.json`.

Browser preprocessing reproduced Python's tensors within 2.384×10⁻⁷ and yielded identical landmark coordinates for all four inputs when passed through the same CPU ONNX runtime. This checks preprocessing only; it is not a real browser runtime performance test.

`check-wasm.mjs` additionally ran the genuine `onnxruntime-web` WASM engine under Node on all four inputs. Both precision variants loaded and returned all keypoints. Single-thread WASM inference took approximately 103–125 ms per input in this local run. See `wasm-validation.json`. This verifies WASM operator support without claiming browser UI integration.

No physical scale, circumference, concealed anatomy, calibrated 3D shape, or fit accuracy has been established. Neither two selected keypoints nor a silhouette can be relabeled as a measured chest or neck circumference without the additional geometry and validation. A small response threshold alone cannot detect all occlusions or recover actual body shape under thick fur.
