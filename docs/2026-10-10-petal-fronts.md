# Ending petal feature-face correction

The user reported malformed-looking Tomato, Shell, Iris and Compass petals and requested inspection of every petal's front, with the Compass needle face facing the viewer.

Inspection covered all 14 existing companion-display GLBs from six axial directions. A second CPU inspection used interpolated per-pixel UVs in glTF image coordinates, triangle back-face culling and a depth buffer: the old polygon-average preview can exaggerate texture artifacts and is not a valid WebGL appearance check. The positive thin-axis heuristic selects the less complete face for ten display assets. Compass -Z shows the intact raised needle; Iris/Pearl -Z show the smoother central form; Shell -Z shows the more complete ribs. Original geometry, texture bytes, loading, prior chapters and spatial trajectories remain unchanged.

| Petal | Reviewed native feature face | Native up | Detail |
|---|---|---|---|
| Rose | -Y | +Z | flower side |
| Clover | +Y | -Z | three-leaf side |
| Golden Leaf | -Z | +Y | complete vein |
| Cactus | -Z | +Y | radial detail |
| Sand | -Z | +Y | four grain faces |
| Iris | -Z | +Y | smooth center and rim |
| Pearl | -Z | +Y | rounded pearl |
| Shell | -Z | +Y | complete ribs |
| Starfish | +Z | +Y | decorative face |
| Peas | +Z | +Y | four rounded peas |
| Tomato | +Z | +Y | crown and body; 0.16 radian look down |
| Compass | -Z | +Y | intact needle and hub |
| Darkmark | -Z | +Y | complete star face |
| Corruption | -Z | +Y | upright skull face |

`src/petal-fronts.js` explicitly maps both face and up axes. Memory installation uses this mapping instead of guessing the positive smallest axis. Uncatalogued geometry retains the previous fallback. The camera-facing display orientation and small existing sway preserve 3D motion without turning the reviewed face away.

Regression was verified red first: ten of fourteen GLB-based ending orientation tests failed because their feature normals pointed away (z approximately -0.966). With the correction all fourteen pass across four ending progress points and animated frames. Full suite: 291/291 pass; git diff --check passes. The tests inspect actual rendered instance rotations, not profile text. CPU appearance inspection is not iPhone Safari/WebGL visual acceptance; original generated-model imperfections are not claimed to be rebuilt.

Publication pending at authoring; baseline original Sites v70 and feature/ending-open-arc branch only.
