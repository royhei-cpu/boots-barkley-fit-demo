# Browser appearance classifier for a rough starting estimate

This is actual local inference, not a generated measurement animation. MobileNetV3 classifies image appearance. The downstream estimator may combine its adult-size priors with observed pet shape. Neither step recovers metric scale from an uncalibrated image. The user explicitly accepted a rough starting guess that they can edit.

## Model and usage

Official model: `torchvision.models.MobileNet_V3_Large_Weights.IMAGENET1K_V2`.

- [Official model and preprocessing](https://docs.pytorch.org/vision/main/models/generated/torchvision.models.mobilenet_v3_large.html)
- [Official weights](https://download.pytorch.org/models/mobilenet_v3_large-5c1a4163.pth)
- [Torchvision source and pretrained-model license notice](https://github.com/pytorch/vision#pre-trained-model-license)
- [Torchvision BSD 3-Clause license](https://github.com/pytorch/vision/blob/main/LICENSE), saved locally in `LICENSE-torchvision.txt`.

Torchvision code is BSD 3-Clause. Its maintainers explicitly warn that pretrained models may have separate terms derived from training datasets. This model uses ImageNet1K. The reviewed model entry did not provide an additional model-specific license grant. Thus this work establishes open-source code provenance, public weight availability, and working inference; it does **not** establish unconditional commercial rights to the weights or training images. Do not describe the weight file as independently verified for all commercial uses. This is not a SWAG model.

The model was downloaded and exported locally without retraining. User media never went to an external inference service. Private test media and per-input results are excluded from the public application.

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| `mobilenetv3-large-v2.onnx` | 21,922,135 | `3e9b932641135bd525b1c6160724e9408d68193f274d76acad8007c0836cdc08` |
| `mobilenetv3-large-v2-fp16.onnx` | 10,992,738 | `57ab69fe4bc22e48ae23d70389a202500fb48c21962abed8f2de832c3b401666` |

Use **one** model, `models/imagenet-labels.json`, and `pet-classifier.mjs` in the browser. FP16 keeps float32 input and output and cuts the classifier download to approximately 10.48 MiB. Both models run using ORT Web 1.22 WASM with one thread. No paid service, account, GPU, or server secret is required for inference. The runtime and existing segmentation/pose models are additional downloads.

```js
const result = await inferPetAppearance({
  ort, session, imageData, labels,
  // bbox optional: XYXY actual pet bounds. Omit for the verified full-frame path.
});
```

Input is `image`, float32 `[1,3,224,224]`. Output is `logits`, float32 `[1,1000]`. Preprocessing is RGB, antialiased bilinear resize with shorter side 232, center crop 224, division by 255, mean `[.485,.456,.406]` and standard deviation `[.229,.224,.225]`. The pure JavaScript resizer implements this protocol, including intermediate 8-bit rounding. Compared with the official Pillow transform across all eight fixtures, its largest channel difference was one 8-bit level; final classifications and size groups were unchanged. It is not claimed bit-identical.

## How the rough prior is chosen

ImageNet contains many domestic dog breed classes and five domestic cat appearance classes. The model was trained for general object classification, not pet measurement or breed verification. Its softmax outputs are **uncalibrated model scores**, never measurement accuracy or breed-certainty percentages.

The application maps supported dog classes to coarse adult build groups. These are hand-authored engineering bins informed by the [AKC adult breed weight chart](https://www.akc.org/expert-advice/nutrition/breed-weight-chart/), approximately toy, small, medium, large, giant. Breeds span boundaries, and these bins are not AKC's official size classification. The [Royal Kennel Club's Corgi standard](https://www.royalkennelclub.com/breed-standards/pastoral/welsh-corgi-pembroke/) explicitly notes that an individual need not match a breed standard. Classifier labels do not establish that the animal is purebred, adult, or a particular weight.

Acceptance rules are unvalidated engineering thresholds: pet score mass at least .40; dominant cat/dog species at least .85 of pet mass; supported size groups at least .80 of that species mass; top overall class must be from the same species. Unsupported variable-size breed classes do not get a default medium profile. A dominant size group with at least .75 supported mass gives one prior. Otherwise, enough leading groups to cover .85 supported mass are normalized into `groupWeights`. Widely separated groups remain a high-uncertainty blend because the user accepts rough starting estimates. They are not presented as a measured size. A clearer image or manual corrections can change this prior substantially.

Recommended integration: require actual pet segmentation before using the appearance result, retain `groupWeights`, then let the estimator use genuine silhouette/pose proportions only when supported. If anatomy is obscured, explicitly describe the numbers as adult-prior starting values. Always permit editing afterward. Do not overwrite edits with late video frames. For uncertain video, aggregate accepted frame priors and retain the disagreement; do not silently report one frame as precise.


## Numerical verification

The exported FP16 model runs in ONNX Runtime Web1.22 WASM. Eight local test inputs preserved top classifications and final acceptance/size-group decisions between FP32 and FP16. This is a numerical compatibility check, not measurement accuracy validation. Six public synthetic classifier/preprocessing tests and seventeen rough-estimator tests cover supported and failed cases.
