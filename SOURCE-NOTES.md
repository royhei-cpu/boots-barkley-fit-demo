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

These are prepared appearance illustrations, not photographs of an actual fitting, a calibrated garment simulation, or previews generated from visitors’ uploads. Changing measurements recalculates the size match but does not reshape the generated outfit. Uploaded pets keep their own photo or selected video frame and use manually entered, tape-confirmed measurements for size matching. Generating a costume appearance for an uploaded pet is not implemented. The cat’s original profile image remains costume-free.

## Own-pet upload flow — September 11, 2026

Photos and videos stay on the visitor’s device as session-only object URLs. A valid decoded photo automatically opens the measurement step. For video, selecting a real frame opens that step immediately; there is no second continue button. The frame becomes the profile photo. Chest, neck, and back start empty; recommendations require valid values and explicit tape confirmation. Optional head measurements are required for styles whose size comparison checks head fit. Sample profiles and prepared sample costume images remain separate and cannot stand in for an uploaded pet. Replacing an upload clears dimensions; changing or reopening measurements requires fresh confirmation. Refreshing clears the uploaded profile.

No image/video measurement engine, pet reconstruction, learned circumference inference, uploaded-pet costume rendering, or validated physical-fit guarantee is implemented. The feature is an assisted profile and size-comparison workflow. The original walkthrough demonstrates sample profiles, not automatic measurement of visitors’ uploads.

Uploaded pet media can be removed from the profile, measurement editor or original-media viewer. Removal clears the own-pet profile, measurements, drafts and recommendations, closes media dialogs and releases the local blob URL. Uncommitted video selections can also be removed without changing an existing pet profile.


## On-device automatic scan prototype — September 11, 2026

Photo/video uploads now run real LRASPP pet segmentation and AP10K RTMPose landmark inference locally using ONNX Runtime Web1.22.0 WASM. Five video frames are sampled automatically. No media is sent to a measurement server. Users may remove their upload and all profile measurements; closing or refreshing the page clears session data.

A complete printed ArUco137 reference has a 10cm outer black square. Suitable reference-backed side and front views enable experimental ellipse-based chest/neck estimates and a neck-to-tail-root span. These populate the measurement review form; corrections are optional. Scale, pose, silhouette and cross-frame consistency filters abstain when evidence is unsuitable. No numeric fallback is produced for ordinary uncalibrated photos or video. Reference coplanarity and physical accuracy are not established automatically. See lib/scan/MEASUREMENT-METHOD.md for geometric assumptions and tests. This is not a validated garment-fitting engine.

Code/model provenance: Torchvision LRASPP MobileNetV3 pretrained segmentation (BSD3 code; upstream pretrained-weight dataset terms apply), OpenMMLab RTMPose-m AP10K (Apache2 project; original AP10K dataset CC-BY4.0, conflicting downstream dataset-guide language recorded), ONNX Runtime (MIT), js-aruco (MIT plus upstream notices). Attribution and exact source URLs are retained under public/scan-runtime/licenses/. Model weights are unchanged except the documented FP16 RTMPose conversion, split into two assets for static hosting. Integrity hashes are in scan-assets.json. The user's personal photo, video, frames and inference results are not part of the public project.

Human scanning references reviewed: https://docs.bodygram.com/platform/endpoints and https://3dlook.ai/content-hub/3dlook-turns-two-photos-structured-body-data/ . Guided perpendicular captures, physical scale inputs, failure states and editable results inform this prototype; neither human SDK is integrated or claimed to support dogs. Pet3D (https://pet3d.ai/) advertises a related early-access service without public integration or measurement-validation documentation.
