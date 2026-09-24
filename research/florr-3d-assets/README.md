# 2n · Florr 3D Resource / Art Direction Gate

Audit date: 2026-09-24. Research branch starts at upstream `experiment/garden-desert-3d-gate` commit `50b7b28`. No Narrative, Hero, Garden, camera, lighting, or production assets have been changed. The `gallery/` folder is independent review material. Its copied assets retain author credit and repository license; none is approved for integration.

## Current project

`2n-spatial-world` deploys through Sites (`.openai/hosting.json`, static `dist`), with Vite/Three.js. The latest remote experimental checkpoint integrates the Garden study after the spatial Hero and drives the same scene via `src/journey.js` camera shots. Existing Garden assets are 1K Poly Haven glTF/JPEG (`studies/garden-art/ASSETS.md`, CC0); these read as natural scenery, hence the weak Florr identity. The old local checkout had a separate diverged history, so this research branch was created from remote HEAD without merging it.

## Source / rights gate

Primary source: [meh-a/florr3d-public](https://github.com/meh-a/florr3d-public), author named **meh-a**. [LICENSE](https://github.com/meh-a/florr3d-public/blob/main/LICENSE) says **CC BY-NC 4.0**: adaptation allowed, attribution and license link required, modifications indicated, noncommercial use only. Public website display is within the stated noncommercial grant if the actual site is noncommercial and all upstream rights are held or licensed by the publisher. Its README says original pre-decimation GLBs were **not included**; individual original model creator/texture provenance is not documented. Therefore exact asset rights beyond the repo-wide grant need clarification before production adoption; a public repo does not prove original Florr game art is independently licensed. All data from this project are a fan reinterpretation, **not official Florr biome data**. Do not deploy on an ad-supported or commercial site without separate permission.

Other sources: [CricketCai's Florr.io diorama](https://sketchfab.com/3d-models/darkest-hours-florrio-diorama-0014c3ec99634203a3a0183711bc8196) is visibly titled Florr.io and has an interactive original preview, but the model-level license and download size could not be verified: **REFERENCE ONLY — LICENSE UNCLEAR**. [NautikalTwilight/florr](https://github.com/NautikalTwilight/florr) by Nautikal and teddybear contains 2D Petal/Mob images and statistics, with no verified image reuse license: **REFERENCE ONLY — LICENSE UNCLEAR**. [Florr Community Wiki Tiles](https://official-florrio.fandom.com/wiki/Tiles) and [World Map](https://official-florrio.fandom.com/wiki/World_Map) are art-direction references; image licenses must be checked per file, not copied as a pack. [3dflorr.net](https://3dflorr.net/) has [public video footage](https://www.youtube.com/watch?v=wG472DpVujk); game availability was not verified in this environment. The [greatluca666 fork](https://github.com/greatluca666/florr3d-public) matches repository size, [Skwhyez fork](https://github.com/Skwhyez/florr3d-public) is empty, and [Cube-Nite variant](https://github.com/Cube-Nite/florr3d-CuNi) exists; none was treated as independent rights clearance.

## GLB audit: `client/assets/`

Triangle counts are summed from the GLB glTF accessors (indexed primitives), not inferred from file size. All have one mesh, no embedded animation, and no Draco. A draw call normally follows each primitive. The preview is in `gallery/`; external source URLs follow `https://github.com/meh-a/florr3d-public/blob/main/client/assets/<filename>`.

| Name | Bytes | Tris | Primitives | Texture | Compression | Priority / use |
| --- | ---: | ---: | ---: | --- | --- | --- |
| ladybug.glb | 65,152 | 15,205 | 1 | 1 embedded | Meshopt + quantization | HIGH VALUE · Garden |
| bee.glb | 63,332 | 8,813 | 1 | 1 embedded | Meshopt + quantization | HIGH VALUE · Garden |
| hornet.glb | 45,512 | 5,896 | 1 | 1 embedded | Meshopt + quantization | HIGH VALUE · Garden / Jungle |
| worker.glb | 33,784 | 6,478 | 3 | none | Meshopt + quantization | POSSIBLE · Ant areas |
| queen.glb | 44,228 | 8,919 | 1 | 1 embedded | Meshopt + quantization | POSSIBLE · Ant areas |
| baby.glb | 24,260 | 4,264 | 3 | none | Meshopt + quantization | POSSIBLE · Ant areas |
| anthole.glb | 14,088 | 416 | 3 | none | no Meshopt declared | POSSIBLE · Ant entrance |
| hornetmissile.glb | 9,596 | 884 | 1 | 1 embedded | Meshopt + quantization | POSSIBLE · Hornet detail |

GLB transfer sizes are good for an individual iPhone asset, yet 15k triangles per Ladybug multiplied by many insects, 3-primitive ants, cloned materials, realtime shadows and transparency can raise GPU cost. `mobmodels.js` loads through GLTFLoader + MeshoptDecoder, clones per Mob and enables shadows. The independent gallery loads one model at a time. **iPhone Safari scene performance remains unverified.** No existing 3D Flower/Player GLB or 3D Petal GLB exists in this repo. Soldier Ant is a worker mesh with extra procedural wings, not a separate GLB.

## SVG, textures, biome inventory

13 Petal SVGs: `basic`, `bubble`, `corn`, `glass`, `leaf`, `light`, `missile`, `orange`, `rice`, `rock`, `rose`, `stinger`, `wing`. These are 2D icons, light enough for review and useful as shape/color references. For Member Petal Orbit prioritize Basic, Rose, Wing, Bubble, Light, Stinger; model them separately in 3D only after selection. Files range 3,575–17,846 bytes. Tile SVGs: `deserttile` 1,328 B, `dirttile` 3,512 B, `grasstile` 2,164 B, `jungletile` 1,920 B. Other files: `grass_color.jpg` 89,011 B; `waternormals.jpg` 248,813 B. There are **no** separate ocean tile or Hel tile in this repository.

`map.json` (~930 KB) is the project's own 50 × 50 grid, with 2,345 floor records, 6,006 wall records, tile size 20, wall height 4, grass/dirt/water/desert/jungle and dirt/stone walls. It is not the original Florr.io world map. `tools/map-builder.html` edits these tile types and Mob spawn parameters. `tiles.js` merges tile geometry, paints desert/jungle patterns and switches water between reflective shader (normal map, 512² reflections) and simple flat material on low quality. `walls.js` merges columns by biome and applies cap textures. `grass.js` creates 80,000 instanced blades with custom shader: too costly as a default iPhone pattern. `world.js` composes the scene and quality modes. `models.js` constructs procedural Flower/Petal/Mob substitutes and swaps GLBs where available. `tools/decimate.mjs` simplifies geometry, prunes, quantizes and Meshopt compresses source GLBs; source GLBs are unavailable here. `shared/config.js` defines Petal names, Mob types and tile palette. `client/public/tile.svg` is a generic site tile icon, not an extra biome tile.

## Art direction and selection

| Biome | Strongest verified identity cue | Gap |
| --- | --- | --- |
| Garden | Ladybug / Bee / Hornet, green tile and petal orbit | Need a recognizable Flower body, local scale and original Garden palette |
| Desert | desert tile, dirt walls, map composition | No unique Desert Mob GLB, landmark or Florr-authentic light reference in this pack |
| Ocean | water normal, basin geometry | Water is generic; no verified Florr Ocean Mob or original map asset |
| Jungle | jungle tile, darker greenery | No unique Jungle Mob GLB; generic grass shader is expensive |
| Hel | no dedicated asset | Need distinct original visual references and rights review |

**HIGH VALUE:** Ladybug, Bee, Hornet and Petal SVG silhouettes as design references; the Mob files have a conditional CC BY-NC grant and provenance caveat. **POSSIBLE:** ant family, map-builder/tile language after stylization and mobile profiling. **REFERENCE ONLY:** original Wiki pages and the Sketchfab diorama until model-level permission is verified; no repository resource should be passed off as official Florr art. **REJECT for direct reuse:** generic flower/bug models unrelated to Florr, empty forks, photorealistic garden packs as the *identity* source, and 80k grass-blade shader on an untested iPhone scene.

## Review and release boundary

Run independent viewer with `npm install` from repository root and `npx vite --config research/florr-3d-assets/gallery/vite.config.js`; build with `npx vite build --config research/florr-3d-assets/gallery/vite.config.js`. Static output lives at `research/florr-3d-assets/review-dist/` and is not the narrative `dist/`. Model files in `gallery/public/` are copied solely for review; no production import references them. All final asset selection belongs to the user.

**WAITING FOR USER ASSET SELECTION**
