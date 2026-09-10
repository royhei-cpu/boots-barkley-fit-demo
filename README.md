# Boots & Barkley Fit Studio

## [Open the public website →](https://royhei-cpu.github.io/boots-barkley-fit-demo/)

No GitHub or ChatGPT login is needed to view the demo.

The complete app source, 30 sample costume previews, Target product images, sample models, and three-dog tutorial video are stored in this repository. GitHub Pages builds the website directly from these files.

[Watch the 1:53 video tutorial](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-walkthrough.mp4) · [Download the complete source](https://royhei-cpu.github.io/boots-barkley-fit-demo/downloads/boots-barkley-fit-demo-source.zip)

Choose Bullseye, the Border Collie, or the Corgi. See the same sample dog before and after wearing each recommended costume, then compare its measurements with the suggested size. The catalog includes 35 Target styles, with missing or conflicting sizing data clearly marked.

Costume previews are generated illustrations, not a physical fit guarantee. Sample measurements are simulated. Upload a photo or video to create your own pet profile; photos advance automatically, and selecting a real video frame continues immediately. Enter chest, neck and back dimensions, and confirm them with a tape to receive Target size comparisons. Your file and profile stay on your device and clear on refresh. Automatic photo/video measurement and costume rendering for uploaded pets are not implemented. The tutorial demonstrates sample profiles.

## Run locally

Clone this repository, then use Node.js 22.13 or newer and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm typecheck` checks the source. `pnpm build` creates the static site in `docs/`. The Pages workflow publishes changes on `main` and rebuilds the downloadable source archive from GitHub. No API key is required for this sample demo.

This independent concept is not an official Target service. Product references and scope are documented in [SOURCE-NOTES.md](SOURCE-NOTES.md).
