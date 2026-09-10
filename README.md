# Boots & Barkley Fit Studio

## [Open the public website →](https://royhei-cpu.github.io/boots-barkley-fit-demo/)

No GitHub or ChatGPT login is needed to view the demo.

The complete app source, 30 sample costume previews, Target product images, sample models, and three-dog tutorial video are stored in this repository. GitHub Pages builds the website directly from these files.

[Watch the 1:53 video tutorial](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-walkthrough.mp4) · [Download the complete source](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-demo-source.zip)

Choose Bullseye, the Border Collie, or the Corgi. See the same sample dog before and after wearing each recommended costume, then compare its measurements with the suggested size. The catalog includes 35 Target styles, with missing or conflicting sizing data clearly marked.

Upload a photo or video to start real on-device pet detection automatically. The scanner analyzes up to five video frames and shows its actual outline and anatomical landmarks. With the printed10cm reference and suitable side/front views, it computes experimental chest/neck/back estimates, fills the review form, and lets you correct values before seeing Target size suggestions. Use **Remove photo/video** to clear the upload, scan and measurements. No account or API key is needed; media stays in this page session.

**Physical measurement accuracy is not validated.** Scale requires the correctly printed reference positioned at body depth. The two-view ellipse calculation is an experimental approximation affected by fur, posture and occlusion. Missing scale, unsuitable views or inconsistent results produce capture guidance, never invented dimensions. The existing three-dog tutorial uses simulated sample measurements; sample costume previews are illustrations. Rendering a costume on an uploaded pet is not implemented.

The repository includes local model weights, runtime, attribution, calibration code and tests. [Measurement method](lib/scan/MEASUREMENT-METHOD.md) · [Lessons from body and face scanners](docs-research/HUMAN-SCANNING-LESSONS.md) · [Pet model research](docs-research/pet-3d-options.md).

## Run locally

Clone this repository, then use Node.js 22.13 or newer and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm typecheck` checks the source. `pnpm test:scan` checks the calibrated geometry and connected-component logic with synthetic fixtures; these tests do not validate physical accuracy. `pnpm build` creates the static site in `docs/`. The Pages workflow publishes changes on `main` and rebuilds the downloadable source archive from GitHub. No API key is required for this sample demo.

This independent concept is not an official Target service. Product references and scope are documented in [SOURCE-NOTES.md](SOURCE-NOTES.md).

If a lightweight transfer ZIP does not include the four large model/runtime assets, run `node scripts/fetch-scan-assets.mjs` to retrieve the version-checked files from this repository. Ordinary Git clones and the GitHub-generated complete download already contain them.
