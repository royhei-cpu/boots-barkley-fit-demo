# Estimate-first prototype method

This module implements the user's revised request for **rough, automatically prefilled, editable guesses without a printable marker**. It is deliberately not described as measured physical dimensions.

## Integration contract

```ts
import {estimatePetFrames, estimatePetSize} from './approximate-estimator';
// Each frame already contains actual segmentation and actual pose outputs.
// Add the corresponding actual appearance classifier result to that frame.
const approximate = estimatePetFrames(framesWithAppearance);
// Retain the existing genuinely reference-calibrated route if it is available.
const result = calibratedResult.status === 'ready'
  ? calibratedResult
  : approximate;
```

`estimatePetSize(frames, prior)` is available for a common accepted prior. `estimatePetFrames(frames)` is preferred for video: each frame has its own `appearance` result, with `{accepted, group, label, species, groupWeights?, uncertainSize?, uncertainty?}`. Accepted broad size-group mixtures are permitted as requested; probabilities are merely blending weights and never presented as confidence or accuracy.

Returns `{status: 'ready-approximate' | 'needs-clear-pet', message, measurements?, method?}`. Measurements are **whole inches**, compatible with the existing `{chest, neck, back, head}` structure. `head: 0` means unavailable, not a measured zero. No output dimensions are provided when pet detection/classification is unsupported or inference failed. UI should not claim precise measurement or guaranteed fit.

`method` includes `kind: 'assumed-scale'`, the group label and normalized group weights, `shapeUsed`, counts of usable/shape frames, per-part source (`group-prior` or `outline-and-prior`), and warnings. In video aggregation an `outline-and-prior` part means at least one contributing frame used that geometry; it does not mean all frames had a clear outline.

## Assumptions and calculations

1. **Absolute scale is assumed.** Broad illustrative adult back/chest/neck bands are explicitly listed in `ILLUSTRATIVE_SIZE_BANDS`. Their midpoints are developer-chosen prototype priors, not measured population means or fitted statistical distributions. Group mixtures blend these midpoints. The model's breed-like appearance is not a verified breed identity.
2. **Detected proportions may adjust the guess.** When neck, tail base and shoulder landmarks are supported by a coherent pet mask, the module samples five nearby body cross-sections. Ratios between silhouette width and projected torso length affect chest/back estimates modestly. Neck proportions are used only if the head is approximately aligned and the neck slice is stable.
3. **A second body diameter is assumed.** The silhouette depth is converted to a candidate circumference using an assumed ellipse width/depth ratio of 0.8 (circumference approximately 2.836 × visible depth). That hidden width is not measured. This candidate is conservatively blended with the group prior and bounded; this is a heuristic, not biological validation.
4. **Poor outlines use stated prior guesses.** Clipped or fragmented masks, ambiguous pose or inconsistent observed proportions produce `shapeUsed: false` and all-prior estimates when the actual appearance classifier and pet mask still support a pet. Gates are not filled in with invented body surfaces. No pose detection is different from a failed pose inference: an explicitly failed frame is rejected; weak pose can use the documented prior-only route.
5. **Video uses per-frame results.** Whole-inch per-frame guesses are combined by medians, with exact duplicate preview pixels/objects excluded. Rejected frames are skipped and reported. Conflicting accepted dog/cat species return blank rather than combine different animal priors. More frames do not establish real scale or calibrated confidence.

Puppies/kittens, mixed breeds, unusually sized pets and thick fur can be substantially wrong. No claim of body-measurement accuracy has been made. The next accuracy work is to collect cleared ground-truth measurements and evaluate these guesses; simply changing a prior or obtaining a plausible costume size does not validate the method.

## Verification

`approximate-estimator.test.ts` contains 17 meaningful tests covering:

- explicit approximation labeling and integer-only measurements;
- doubling image resolution and cropping empty margins without changing outputs;
- actual silhouette proportions changing output within one prior;
- different and mixed size priors, including accepted nonadjacent mixtures;
- missing/unsupported classification, missing pet, corrupt masks and failed inference leaving values blank;
- gate-like gaps, clipped/fragmented outlines, unsupported tail landmarks and weak pose producing documented prior-only fallback;
- inconsistent shape frames, video medians, exact-frame deduplication and mixed-species rejection.

All 17 tests pass, and the pure module passes strict TypeScript checking. These tests verify behavior and invariants, **not biological accuracy**. No personal-photo fixture or sample identity is embedded in this code.
