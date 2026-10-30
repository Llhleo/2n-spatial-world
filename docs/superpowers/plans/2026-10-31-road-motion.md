# Road motion refinement implementation plan

Goal: implement the seven screenshot corrections in the existing independent preview.
Spec: ../specs/2026-10-31-road-motion-design.md

1. Traffic: test faster positive breathing speed, preserved circular gaps, larger varied sizes, smooth lane-local motion; implement in road-traffic.js and road-story/geometry.js; run clearance audit.
2. Type: enlarge vector text and choose three separate road-free areas; generate required new line meshes using the existing font contour pipeline; check projected positions and font masks.
3. Arrival: test world-space continuity, actual-camera orientation, held-progress movement, and no road traffic in ending view. Relocate ending frame, cache exit curve, replace early spherical preview with an independent curved escort; keep the particle choreography and native scroll mapping.
4. Performance: restrict visible instance upload ranges, cache static transforms and camera curves; verify same visible poses and compare deterministic CPU benchmark and upload bytes.
5. Run full Node suite, build with valid GitHub asset revision, independent review, push feature branch and publish the same private preview.

Review focus: narrow phone layouts; lane clearance at speed extrema and far recycling bends; reverse across the ending boundary; real-camera petal orientation during flight; unchanged ending particle/native scroll timing.
