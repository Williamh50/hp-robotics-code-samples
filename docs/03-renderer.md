# Sample 3: WebGL 3D interaction and articulation

**Source:** [`src/renderer.js`](../src/renderer.js)

**Problem:** Students need visual feedback when changing physical joint targets without having to operate motors while experimenting.

**Approach:** The renderer sets up WebGL shaders and mesh buffers, uses matrix transforms to articulate linked robot parts, draws a spatial reference grid, and connects user interface controls to virtual joint positions. It also supports perspective/camera controls and other scene interactions within the application's browser UI.

**Tradeoffs / caveats:** This source originates in a DOM-integrated app: it references canvas elements, window geometry assets and UI controls. It is intentionally **not a standalone module demo** and is not covered by the Node unit tests in this repository. For an interview, be prepared to discuss its use of WebGL, transform math, browser frame loop and dependencies.

**For the applicant to write in their own words:**
- Which renderer, camera, articulation, or interaction features did I implement or refine?
- How does my understanding of 3D art/rigging influence the technical design?
- What performance or architecture improvements would I make for the next release?
