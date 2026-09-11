# Uploaded-pet costume preview

The same accepted scan frame supplies both the displayed pet photo and placement geometry. A photo with usable torso landmarks is preferred over a silhouette-only video frame. The scan’s estimate aggregation is unchanged; choosing a display frame does not change any measurement.

The renderer uses a garment-only generated illustration for each supported catalog style. The corresponding Target product image guided each illustration. These are approximate representations; details, coverage, fabric and openings are not guaranteed to reproduce the product. Eleven supported styles are separate from the 35-style catalog. Unsupported styles explicitly report that no preview is available, and can still be inspected for size specifications.

Source artwork uses flat cyan. The browser removes the cyan matte, trims the image to its visible bounds, and maps the costume onto a torso rectangle from neck/tail landmarks and the pet silhouette. If landmarks are weak but an outline is usable, PCA provides a visibly disclosed placement fallback. Empty/invalid outlines abstain. This geometry is for illustration only and does not recover real garment shape, metric scale, drape, cloth behavior, comfort or physical fit. No trained virtual try-on model runs here.

An alpha mask restores original face pixels over body costumes. Headwear uses face anchors instead. Controls move, resize, rotate and flip only the garment; the actual photo remains unchanged. Each costume’s adjustments are shared between the gallery and its detail dialog. A replacement or new accepted frame resets adjustments. Failed rescans keep the existing photo and its matching geometry. Removing the upload clears all pet data and previews. Downloads contain no visitors’ photos or measurements.

Photos, video frames and composed previews stay in memory in the visitor’s browser. No server inference, API key, storage upload or external photo submission is used. Changing measurements recalculates size recommendations; it does not reshape fabric in the mock-up. The original button shows the unmodified photo. Video try-on uses one selected still frame, not animated clothing tracking.

Validation: geometry tests cover left/right orientation, head restoration, no-pet abstention and exact frame selection. Browser checks use a supplied oblique pet photo and a short occluded video. Appearance quality and physical accuracy have not been validated against real garment fittings.
