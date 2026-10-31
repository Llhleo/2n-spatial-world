# Ending light and petal route repair

User requests: fix particle-ending light/color and repair or redesign the passage from circling the cloud to circling the final 2n.

Root causes: the road renderer disables every external light, including the destination memory studio. Its terrain callback also rewrites light powers after the environment blend. Petal escorts sample the older gate timing, while the rendered fluid follows materialRouteTime. The final arrival interpolates distant Cartesian points in a short interval, producing an untidy intermediate scatter; the old band is also centered too low.

Use a scoped transition from road studio to the destination's neutral white studio through the existing camera exit. World lights remain isolated. Apply environment powers after terrain chooses its baseline, and restore all light state after render.

For particle mode, follow the canonical material route with one open orbital band. As the unshaped cloud returns, petals retain their angular order. Once the mark forms, each identity smoothly adjusts angle, radius, height and depth into the final clockwise orbit, using polar coordinates to prevent center-crossing collapse. Keep a low inclined XZ band with shallow vertical variation and genuine front/back occlusion; preserve model fronts, ambient movement, reverse continuity, particle count and original legacy ending.

Validate against actual scene matrices and model bounds as well as pure samplers, both portrait and landscape, idle/rewind, rendering order, scoped light restoration and full suite/build. Publish the same preview and feature branch, not main. WebGL2 browser rendering remains unavailable in this environment.
