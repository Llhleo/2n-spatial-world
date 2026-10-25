# Road History Implementation Plan

> **For agentic workers:** Use executing-plans inline; one final fresh-context review.

**Goal:** Integrate the reviewed three-scene road story into a new branch and publish a separate preview Site.

**Architecture:** One Three.js renderer and production asset pipeline. A time-based gesture player selects scene endpoints. Ambient simulation remains independent. Existing particle ending remains intact.

**Tech Stack:** Three.js r180, Vite, node:test.

**Spec:** ../specs/2026-10-25-road-history-design.md

## Global Constraints

No main merge or original Site deployment. Real PETAL assets only. No scene masks. Independent ambient clock. Deterministic random gaps with clearance. Exactly three luminous travelers sharing one closed path. Preserve history data and particle ending.

## Review Focus

Rapid touch reversal must not replay stale inertia; huge wheel deltas cannot skip scenes; paused foreground must retain ambient movement; recycling must occur outside every journey view; entry/exit camera poses must match in both directions.

### Task 1: Gesture time player

- [x] Add failing node tests for equal speed at different gesture sizes, one-segment queue, reverse from current time, clamped dt, no spontaneous start.
- [x] Implement `createGesturePlayback` with `request(direction)`, `advance(dt)`, `seek(seconds)`, and state getters.
- [x] Verify the tests and connect raw direction input to production history/ending progress.

### Task 2: Road story runtime

- [x] Add failing tests for varied seeded spacing, density, petal selection, closed shared light path, and scene camera boundaries.
- [x] Extract reviewed v11 geometry, replace temporary meshes with culled InstancedMesh pools, merge background geometry, preserve GPU tidal waves, add light travelers.
- [x] Add `createGuildRoadStory({historyRecords})` accepting production `install(source,kind,name)`, `prepare()`, `update`, and entry frame.
- [x] Verify 10-minute recycling, movement, and geometric continuity.

### Task 3: Integration and preview

- [x] Connect people chain capture, physical entry, road journey, and physical exit into the existing particle ending.
- [x] Regenerate font geometry for actual history records, build, and run relevant regression tests.
- [x] Final independent code review; fix important findings with regression tests.
- [x] Commit source changes to the new GitHub branch. Publish a separate private Site from the exact prepared source; return its URL and verification limits.

Final review: independent reviewer checked integration; ending-shell arrival and readiness defects fixed, native diagnostic touch scrolling restored. No remaining code blocker. WebGL and Safari visual checks remain unverified.
