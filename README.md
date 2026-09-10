# Boots & Barkley Fit Studio — concept demo

[Open the private interactive demo](https://barkley-fit-studio.lhei111.chatgpt.site). Sign in with the same owning ChatGPT account on your work laptop.

[Download full source ZIP](https://barkley-fit-studio.lhei111.chatgpt.site/downloads/boots-barkley-fit-demo-source.zip) · [Watch/download the video](https://barkley-fit-studio.lhei111.chatgpt.site/downloads/boots-barkley-fit-walkthrough.mp4)

## Watch the process

Download **boots-barkley-fit-walkthrough.mp4**. It demonstrates guided capture, the pet measurement profile, and size-by-size comparisons for actual Target Hot Dog, Highland Cow, Bat Wings and Chicken costumes. Bullseye, a larger Border Collie and a smaller Corgi illustrate different body shapes and sizes.

## Run the source

Download and unzip **boots-barkley-fit-demo-source.zip**. Open the extracted folder. With Node.js 22.13+ and pnpm 11 installed, run:

```sh
pnpm install
pnpm dev
```

Open the local address printed in the terminal. For a production build, use `pnpm build`. Full setup, source references and limitations are inside the ZIP in `README.md` and `SOURCE-NOTES.md`. No API keys are required.

## What this concept does

Local photo/video preview and costume-size calculations work. Sample capture images and measurements are simulated; the app does not measure an arbitrary uploaded pet. Product images and links come from Target. Hot Dog and Highland Cow examples use published item specifications; Bat Wings and Chicken use a clearly marked general chart and need item-level confirmation.

The catalog contains 35 public Target style families checked September 10, 2026, not live stock or checkout. Exact fit also needs supplier-approved specifications and comfort/movement checks. This independent private concept is not an official Target service.
