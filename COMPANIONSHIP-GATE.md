# Hell → 同行的力量
Baseline: main 7ddf05cb9f1d97e231654909b0c07600620d9a87 / Sites v33.

The first 28 viewport units retain all existing camera paths and durations.
Twelve units are appended: inherited Hell motion → rising arc → lookback → petal gathering → stationary reading shot.
The legacy progress reaches 1 at the Hell exit; companionship occupies 1–40/28.
Only the scroll-range mapping, resource callbacks and end-of-timeline branch change.
No original monument, terrain, petal layout, Garden path or loading strategy is replaced.

Five representative cached GLBs: Garden Clover, Desert Cactus, Ocean Shell,
Jungle Compass, Hell Darkmark. 3 instances per species on phones, 4 on desktop.
Shared geometry, one cloned material and one instanced draw per species.
No new assets or downloads. Installation and text texture creation happen at the opening,
before existing GPU preparation. Text meshes also participate in warmup.
Petal matrices are sampled from scroll progress; the terminal reading shot is stationary.
A neutral, thinner atmosphere gradually reveals the previous terrain without forcing all
five regions into a portrait view. This atmospheric adjustment applies only after Hell.
World-space text uses fixed oriented planes, not a screen overlay.

Tests cover endpoint position, focus, velocity, reading hold, reverse/fast seeks,
instance counts, open reading space and projected phone text margins.
Build/test/Pages publication are verified separately from WebGL visual acceptance.
No browser or terminal is exposed in this recovery session, so GitHub Actions runs validation.
iPhone Safari performance and actual GLB face orientation remain device acceptance items.
