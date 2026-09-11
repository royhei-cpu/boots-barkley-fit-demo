# Boots & Barkley Fit Studio

## [Open the public website →](https://royhei-cpu.github.io/boots-barkley-fit-demo/)

No GitHub or ChatGPT login is needed to view the demo.

The complete app source, 30 sample costume previews, 11 garment overlay illustrations, Target product images, sample models, and three-dog tutorial video are stored in this repository. GitHub Pages builds the website directly from these files.

[Watch the 1:53 video tutorial](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-walkthrough.mp4) · [Download the complete source](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-demo-source.zip)

Choose Bullseye, the Border Collie, or the Corgi. See the same sample dog before and after wearing each recommended costume, then compare its measurements with the suggested size. The catalog includes 35 Target styles, with missing or conflicting sizing data clearly marked.

Upload a photo or video to start automatic on-device analysis. The scanner samples up to five video frames, detects the pet, and uses its appearance plus usable body proportions to prefill **rough chest, neck and back estimates**. Review or edit any value and see Target costume suggestions. No printing, account or API key is required. **Remove photo/video** clears the upload, scan and measurements; media stays in this page session.

**These are editable guesses, not verified physical measurements.** A small visual classifier selects/blends illustrative typical adult size priors; available silhouette/landmark ratios adjust them. Absolute scale is assumed. Poor views, unusual sizes, puppies and mixed breeds can produce large errors. Unreadable files, model failures and unsupported pet detections open a clear editable fallback with unavailable fields left blank. The existing tutorial uses simulated sample measurements; sample costume previews are illustrations. Click a supported costume to see an illustrated overlay on your actual pet photo or an automatically selected video frame. Move, resize, rotate or flip its placement, and compare with the original. This is an adjustable 2D mock-up, not photorealistic redressing or a physical garment-fit simulation. Eleven styles have overlays; unsupported styles are labeled.

The repository contains the real model weights, runtime, attribution, estimation code and tests. [Costume preview method](lib/try-on/METHOD.md) · [Rough estimation method](lib/scan/APPROXIMATE-METHOD.md) · [Geometry method](lib/scan/MEASUREMENT-METHOD.md) · [Lessons from body and face scanners](docs-research/HUMAN-SCANNING-LESSONS.md).

## Run locally

Clone this repository, then use Node.js 22.13 or newer and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm typecheck` checks the source. `pnpm test:scan` checks rough-estimation behavior, geometry and connected-component logic; synthetic tests do not validate real-world accuracy. `pnpm build` creates the static site in `docs/`. The Pages workflow publishes changes on `main` and rebuilds the downloadable source archive from GitHub. No API key is required for this sample demo.

This independent concept is not an official Target service. Product references and scope are documented in [SOURCE-NOTES.md](SOURCE-NOTES.md).

If a lightweight transfer ZIP does not include large model/runtime assets, run `node scripts/fetch-scan-assets.mjs` to retrieve the version-checked files from this repository. Ordinary Git clones and the GitHub-generated complete download already contain them.
