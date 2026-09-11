# Data and visual references

Checked September 10, 2026. Catalog snapshot: 35 distinct public product families, 31 Boots & Barkley and 4 Hyde & EEK, deduplicated by family. Listing counts varied across reads, so this is not a live inventory guarantee. Target includes a Thanksgiving Turkey item in the Pet Halloween Costumes collection; it is retained.

- Boots & Barkley collection: https://www.target.com/c/pet-halloween-costumes-holiday-shop/boots-barkley/-/N-5tf58Zvyzcr
- Hyde & EEK collection: https://www.target.com/c/pet-halloween-costumes-holiday-shop/hyde-and-eek-boutique/-/N-5tf58Zq643leo4u2a
- General size guide: https://digitalcontent.target.com/itemcontent/sizecharts/htmlfragments/pets-boots-clothing/boots-barkley/clothing.html
- Current brand direction: https://corporate.target.com/news-features/article/2025/04/boots-and-barkley
- Official current brand reference: https://corporate.target.com/getmedia/007f5c77-fbfa-4cff-b133-13e646d7e33b/Owned-Brands-Boots-Barkley.png?width=940

## Main item specification inputs (inches)

| Item | Neck | Chest | Overall garment length | Source |
| --- | --- | --- | --- | --- |
| Hot Dog S | 10–16 | 16–26 | 14.82 | https://www.target.com/p/-/A-90479751 |
| Hot Dog M | 14–20 | 20–28 | 21 | https://www.target.com/p/-/A-90479750 |
| Hot Dog L | 18–24 | 26–35 | 18.7 | https://www.target.com/p/-/A-90479757 |
| Highland Cow XS | 7–12 | 10–13 | 12 | https://www.target.com/p/-/A-94237128 |
| Highland Cow S | 11–15 | 13–19 | 15 | https://www.target.com/p/-/A-94237136 |
| Cat glitter wings, one listed fit | 8–16 | 11–23 | 9.75 | https://www.target.com/p/-/A-84989779 |
| Pumpkin full body S | 11–15 | 13–19 | 12.48 | https://www.target.com/p/-/A-95002330 |
| Pumpkin full body M | 13–18 | 19–27 | 14.04 | https://www.target.com/p/-/A-95002275 |
| Pumpkin full body L | 15–20 | 27–34 | 15.6 | https://www.target.com/p/-/A-95002263 |
| Skeleton S | 11–15 | 13–19 | 23.4 | https://www.target.com/p/-/A-95002375 |
| Skeleton M | 13–18 | 19–27 | 25.74 | https://www.target.com/p/-/A-95002349 |
| Skeleton L | 15–20 | 27–34 | 28.47 | https://www.target.com/p/-/A-95002342 |
| Grape S | 11–15 | 13–19 | 14.04 | https://www.target.com/p/-/A-95032069 |
| Grape M | 13–18 | 19–27 | 15.6 | https://www.target.com/p/-/A-95032065 |
| Grape L | 15–20 | 27–34 | 17.16 | https://www.target.com/p/-/A-95032057 |
| Burrito XS | 7–12 | 10–13 | 10 | https://www.target.com/p/-/A-95002346 |
| Burrito S | 11–15 | 13–19 | 11.5 | https://www.target.com/p/-/A-95002343 |
| Burrito M | 13–18 | 19–27 | 17 | https://www.target.com/p/-/A-95002341 |
| Burrito L | 15–20 | 27–34 | 20 | https://www.target.com/p/-/A-95002390 |

The shared charts may differ from these item Specifications. Hot Dog L's overall length is smaller than M's, so garment length is not used to infer acceptable pet back length or select a size. Hot Dog L is listed for dogs; the matcher excludes that variant for cats. Weight is not used to select a size.

The additional verified Pumpkin full body, Skeleton and Grape S/M/L variants are listed for dogs only. Burrito XS/S list dogs and cats; Burrito M/L list dogs only, and those variants are excluded for cats. These four families are sourced in `lib/verified-item-sizes.json`. Only the verified variants above are evaluated for these styles; an unmatched profile does not establish that every possible retail variant is unsuitable. Pumpkin full body is a separate product family from the original Pumpkin hoodie, which still uses the general guide. At chest 19 and neck 13 inches, the new S and M ranges both include the measurements; S is selected by the comparison score and flagged near a size boundary. At chest 30 and neck 21 inches, their L chest range includes the chest but its neck maximum is 20, so no size is suggested.

Shopping Cart L Specifications: neck 18–24, chest 26–35, length 22. Embedded chart: neck 15–20, chest 27–34, length 19. Source: https://www.target.com/p/-/A-90920341 . Recommendation withheld.

## Illustrative samples

| Profile | Chest | Neck | Back | Head | Main demonstration |
| --- | --- | --- | --- | --- | --- |
| Bullseye-inspired individual | 24 | 17 | 17 | 17 | Hot Dog M |
| Scout, Border Collie individual | 30 | 21 | 22 | 23 | Hot Dog L |
| Pip, Corgi individual | 19 | 13 | 16 | 13 | Hot Dog S |
| Cleo, cat individual | 12 | 9 | 11 | 10 | Highland Cow XS |

All sample measurements are precomputed demonstration inputs, not breed-wide facts or dimensions of Target's real mascot. Pet concept images are AI-generated. Product photographs and the brand reference are from official Target pages; links and provenance are preserved.

Generic sample 3D dog: Shiba Inu by Quaternius, CC0 https://poly.pizza/m/y4wdQpg767 . Generic cat: Quaternius CC0 https://poly.pizza/m/qKICY6xla2 . Models are for rotation demonstrations only; they are not the photographed pets and are not measurement tools.

## Prepared costume appearance previews

The sample before/after gallery uses generated illustrations of the same Bullseye-inspired dog, Border Collie, and Corgi, each guided by its original pet image and the corresponding Target product photograph. It covers all default-profile recommendations: 9 for Bullseye, 10 for Corgi, and 5 for the Border Collie. All ten supported dog-costume families have a prepared look for each sample dog, including additional styles that can match adjusted measurements. Published assets are WebP exports of the generated masters.

These are prepared appearance illustrations, not photographs of an actual fitting, a calibrated garment simulation, or previews generated from visitors’ uploads. Changing measurements recalculates the size match but does not reshape the generated outfit. Uploaded pets keep their own photo or automatically selected video frame and use reviewed rough estimates or manually corrected measurements for size matching. Eleven styles also support a separate browser-local illustrated overlay on the visitor’s actual photo or selected video frame. See `lib/try-on/METHOD.md`. The cat’s original profile image remains costume-free.

## Own-pet estimate-first flow — September 11, 2026

A photo or video starts automatic analysis and then opens an editable measurement form. Supported detections prefill rough chest, neck and back estimates in whole inches; head circumference remains optional and unavailable until entered. The owner can change any value and select **See costume matches**. No printed reference, manual frame selection, or confirmation checkbox is required. Actual scan results and sample profiles remain separate.

Images are decoded before model downloads begin. Unreadable media, scanner loading/inference errors, unclear pet detection, and a valid profile with no matching costume have different paths. Failed/unsupported scans open the same editable form with unavailable values blank, rather than claiming successful measurement. A failed rescan does not erase previously accepted edits. Closing cancels callbacks; removal clears the upload, profile, drafts and recommendations. Media and results remain in memory in the visitor’s page session, never sent to a measurement service or stored by this site.

## Actual estimation method and limitations

ONNX Runtime Web1.22.0 WASM runs LRASPP pet segmentation, AP10K RTMPose landmarks, and a MobileNetV3-Large ImageNet1K V2 appearance classifier locally. Up to five video frames are selected automatically. The classifier selects or blends coarse typical adult size groups. The groups provide **assumed absolute scale**, not metric information recovered from pixels. Usable body-outline/landmark ratios conservatively adjust these illustrative priors. When the body outline is obscured but pet appearance is supported, values are explicitly typical-size guesses. The classifier is not a trained pet circumference or physical-size regression model. Its raw scores are not presented as measurement confidence or accuracy.

The result is a prototype starting guess, not validated metrology or a garment-fit guarantee. Breed ambiguity, puppies, mixed breeds, unusual sizes, fur, perspective and occlusion can cause substantial errors. Similar-looking small and large pets may be indistinguishable from ordinary unscaled images. Ground-truth tape comparisons on held-out pets are still required. The older calibrated geometry implementation is retained for supported calibrated data and tests, but printing and calibration setup are absent from the customer path.

See [rough estimation method](lib/scan/APPROXIMATE-METHOD.md) and [calibrated geometry](lib/scan/MEASUREMENT-METHOD.md). No 3D pet reconstruction or photorealistic uploaded-pet redressing is implemented. The own-pet try-on is an adjustable 2D illustration. The existing three-dog tutorial uses simulated sample measurements and prepared costume illustrations.

Code/model provenance: Torchvision segmentation and classification (BSD3 code; upstream pretrained-weight dataset terms apply), OpenMMLab RTMPose-m AP10K (Apache2 project; original AP10K dataset CC-BY4.0, conflicting downstream dataset-guide language recorded), ONNX Runtime (MIT), js-aruco (MIT plus upstream notices). Attribution, original model URLs and conversion details are retained under public/scan-runtime/licenses/. Integrity hashes are in scan-assets.json. Private user media and private trial results are not public assets or fixtures.

Human-scanning inspiration: [Bodygram](https://docs.bodygram.com/platform/first-scan) combines human statistics with photos; [3DLOOK](https://3dlook.ai/mobile-tailor/for-made-to-measure/) guides front/side capture and uses supplied size information. Their human models and accuracy claims do not transfer to pets. The current prototype borrows the distinction between prediction inputs, editable estimates and matching, without integrating a paid SDK. [Research comparison](docs-research/HUMAN-SCANNING-LESSONS.md).
