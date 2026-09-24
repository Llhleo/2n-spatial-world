# Five-biome resource gate / 五境资源分类

Date: 2026-09-24. Review-only, no production integration. Scope: the five Florr realms Garden, Desert, Ocean, Jungle, Hel (not Ant Hell). The user's 2n site is permanently noncommercial and non-revenue-generating. This fits the NC purpose of the 3dflorr repository's CC BY-NC 4.0, **but does not cure uncertain original game-art rights**. The categories below answer both visual/technical readiness and website-use clearance; direct-use is intentionally strict.

## Terms used in every realm

- **能直接用 / Direct-use candidate** = original user-provided or generated background, clean and available as a review/production candidate without copying a third-party picture. No production page was changed. AI-generated images may still need final inspection and site-specific mobile compression.
- **不能直接用 / Reference-only or conditional** = even a crisp vector or an appropriately sized GLB is held here if the original art owner has not granted public website reuse, if creator provenance is missing, or if it still requires making an actual 3D model. You may inspect the original link, but it has not been redistributed into the 2n repo. “Reference-only” does not mean one may trace/copy game art without permission.
- All original screenshots with UI, IDs, text overlays, low visual clarity, or 2D PNG sprites stretched to a 3D scene are **superseded in the shortlist**. Originals have not been deleted. SVG = resolution-independent 2D art; `.tmj` = Tiled map data; neither is a GLB or an iPhone-tested 3D environment.

## Source audit and quality replacement

1. [ashish.top/assets_browser](https://ashish.top/assets_browser) live page displayed **118 Petal IDs, 73 Mobs**, and previews like `https://florr.io/petals/1.svg` and `https://florr.io/mobs/1.svg`. The images are SVG vectors referenced from the game's domain; browser display natural size was 150×150, which is an intrinsic/rendered dimension, **not a 150-pixel raster-resolution ceiling**. Numerous rarity versions are not distinct Petal types. No name-to-ID/biome license mapping was presented in that scanner UI; do not invent one. The site's own licensing is not a license for game assets. Clear SVGs replace blurry/lettered raster thumbnails **for visual inspection**, but remain reference-only for public website reuse until permission is settled.
2. [maps.ashish.top](https://maps.ashish.top/) advertises live/current map data from the game and listed Garden, Desert, Ocean, Jungle and **Hel**, plus separate Ant Hell and other areas in its file tree. It says “Map data belongs to florr.io.” An earlier community [nardzy map archive](https://github.com/nardzy/florr-io-maps/tree/main/client/src/mod/asset/map) contains five `.tmj` files and 115 SVG tiles. The archive's code GPL-3.0 is **not a blanket upstream art license**. Use the viewer for current layout and SVG tiles for crisp reference, not copied production textures. Map canvas did not stay visible in the review browser after opening a map, so no claim that the current five maps were all visually verified frame by frame.
3. The user's five **separate AI-generated background images** in Library are clean, no UI/text overlays, each **1504×1046 PNG**, about 0.98–1.05 MB. These supersede the five game screenshots and low-quality blocked captures in the candidate list. They are good review material and plausible phone background candidates, **not UHD/4K source material**. Do not upscale a blurry icon and call it HD; for full-width large screens, new higher-resolution generations or an original vector redraw should be considered in a separately approved production round.
4. [meh-a/florr3d-public](https://github.com/meh-a/florr3d-public/tree/main/client/assets) has eight lightweight `.glb` and 13 `.svg`; its [repo license](https://github.com/meh-a/florr3d-public/blob/main/LICENSE) says CC BY-NC 4.0 (credit, license link, change notice). User confirms noncommercial status; upstream model/image ownership and Florr IP remain unverified, so **conditional, not unqualified direct-use**. Gallery: https://florr-3d-asset-review-2n.llhleo.chatgpt.site/ . No other realm-specific model GLB verified.
5. [NautikalTwilight/florr](https://github.com/NautikalTwilight/florr) and [Furaken/florr.io](https://github.com/Furaken/florr.io) offer named PNGs to map species and Petal names, but PNG copies are not preferable to the source SVGs for scaling. Neither has a verified game-art reuse grant; Furaken explicitly describes extraction by script. These are labeled, historically useful **reference-only** indexes, not site assets.

## Garden / 花园

### 能直接用 / Direct-use candidate

- User-generated, no-overlay `清新绿意抽象叶花图案背景.png` (Library original title; 1504×1046, 979,129 B). Bright green flower/leaf motif, clean enough to inspect and likely usable for a background after mobile optimization. The authoritative copy remains in the user's Library. Does **not** convey the scene's 3D geometry or Flower body.

### 不能直接用 / Conditional or reference-only

- [Ladybug GLB](https://github.com/meh-a/florr3d-public/blob/main/client/assets/ladybug.glb), 65,152 B, 15,205 triangles; [Bee GLB](https://github.com/meh-a/florr3d-public/blob/main/client/assets/bee.glb), 63,332 B, 8,813 triangles; [Hornet GLB](https://github.com/meh-a/florr3d-public/blob/main/client/assets/hornet.glb), 45,512 B, 5,896 triangles. Technically usable in Three.js with Meshopt, but credit, noncommercial use and original creator/game-rights verification still required. Mobile scene performance untested.
- [Garden map](https://maps.ashish.top/), [grass tile SVG](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/grass_c_0.svg), [Ladybug named image](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/garden_ladybug.png). Layout and silhouette references only; do not stretch the PNG into a hero graphic.
- The 3dflorr procedural Flower is not a standalone licensed Flower GLB. A recognizable Flower + face + orbit requires a separate authorized model decision.

## Desert / 沙漠

### 能直接用 / Direct-use candidate

- User-generated clean `米色流沙波纹与方块背景.png`, 1504×1046, 979,996 B. No screenshots/labels. Suitable flat art-direction layer, **not** sand dunes/landmarks or ready-to-render 3D environment.

### 不能直接用 / Conditional or reference-only

- [Current Desert map preview](https://maps.ashish.top/), [archived desert TMJ](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/maps/desert.tmj), [desert SVG tile](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/desert_c_0.svg) — layout and crisp tile-edge reference; game-data rights unclear.
- [Scorpion image](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/scorpion.png), [Desert Centipede](https://github.com/Furaken/florr.io/blob/main/image/0_no-background/mob/common/centipede_desert.png), [Cactus Petal](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/petals/Common/cactus.png). 2D/rights uncertain. No Desert-specific GLB or tested iPhone mesh yet.

## Ocean / 海洋

### 能直接用 / Direct-use candidate

- User-generated clean `蓝色海洋波纹鹅卵石图案背景.png`, 1504×1046, 1,045,066 B. Water-band/pebble palette, no text; flat background, not an actual water shader or scene.

### 不能直接用 / Conditional or reference-only

- [Current Ocean map preview](https://maps.ashish.top/), [archived ocean TMJ](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/maps/ocean.tmj), [ocean SVG](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/ocean_c_0.svg), [coral SVG](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/coral_c_0.svg). Vector clarity helps review; website copying not cleared.
- [Ocean Crab](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/ocean_crab.png), [Jellyfish](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/jellyfish.png), [Pearl Petal](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/petals/Common/pearl.png), [Coral Petal](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/petals/Common/coral.png). Named 2D references, not licensed Ocean GLBs.
- 3dflorr `waternormals.jpg` is a water-normal texture only. It does not make the result distinctly Florr Ocean; source credit and provenance still apply.

## Jungle / 丛林

### 能直接用 / Direct-use candidate

- User-generated clean `绿色几何图案壁纸.png`, 1504×1046, 984,659 B. Darker green triangles/circles distinguish Jungle from bright Garden, but do not depict a ready 3D jungle.

### 不能直接用 / Conditional or reference-only

- [Current Jungle map preview](https://maps.ashish.top/), [archived jungle TMJ](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/maps/jungle.tmj), [bush SVG tile](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/bush_c_0.svg). Rights/provenance unresolved.
- [Mantis](https://github.com/Furaken/florr.io/blob/main/image/0_no-background/mob/common/mantis.png), [Firefly](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/firefly.png), [Lotus Petal](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/petals/Common/lotus.png). Not 3D, no direct asset grant found. 3dflorr's 80,000-blade grass shader is not a validated iPhone production shortcut.

## Hel / 地狱（不是 Ant Hell）

### 能直接用 / Direct-use candidate

- User-generated clean `红色波纹几何背景.png`, 1504×1046, 1,041,223 B. Red waves/squares and no labels, **flat** art-direction base. This is not proof of a usable Hel 3D lighting/material asset.

### 不能直接用 / Conditional or reference-only

- [Current Hel map preview](https://maps.ashish.top/), [archived hel TMJ](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/maps/hel.tmj), [Hel tile SVG](https://github.com/nardzy/florr-io-maps/blob/main/client/src/mod/asset/map/tiles/hel_c_0.svg). Separate from Ant Hell; game tile and map rights unverified.
- [Hel Beetle](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/hel_beetle.png), [Hel Centipede](https://github.com/NautikalTwilight/florr/blob/main/florrio_resources/florrio_icons/mobs/Common/AS/hel_centipede.png), [Hel Wasp](https://github.com/Furaken/florr.io/blob/main/image/0_no-background/mob/common/wasp_hel.png). 2D model briefs only. No Hel GLB verified.

## Shared across the five / Petal orbit

The [live Petal scanner](https://ashish.top/assets_browser) is the sharper **SVG reference viewer** for all five regions, and 3dflorr's [13 Petal SVGs](https://github.com/meh-a/florr3d-public/tree/main/client/assets) provide named previews. Initial visual focus: [Basic](https://github.com/meh-a/florr3d-public/blob/main/client/assets/basic.svg), [Rose](https://github.com/meh-a/florr3d-public/blob/main/client/assets/rose.svg), [Wing](https://github.com/meh-a/florr3d-public/blob/main/client/assets/wing.svg), [Bubble](https://github.com/meh-a/florr3d-public/blob/main/client/assets/bubble.svg), [Light](https://github.com/meh-a/florr3d-public/blob/main/client/assets/light.svg), [Stinger](https://github.com/meh-a/florr3d-public/blob/main/client/assets/stinger.svg). Source files are 2D. Attribution + NC are possible for the repository grant, but upstream game-art and model rights remain to verify. User has **not chosen** which Petals to model.

## Hold points / do not silently integrate

No high-resolution replacement portrait/Mob PNG was copied into the website. The source SVGs eliminate blur as **references**, not the permission problem. Existing five generated backgrounds are clean but only 1504×1046; do not describe them as 4K. No current Hero/Garden/camera/other biome development, production asset replacement, or gallery publishing occurred. Before later implementation: user chooses assets, exact rightsholders/license are confirmed for direct game-asset copying, and any new 3D models are profiled on iPhone Safari.

**WAITING FOR USER ASSET SELECTION**
