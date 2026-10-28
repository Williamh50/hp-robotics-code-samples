# Sample 1: Motion sequence validation

**Source:** [`src/motion-sequence.js`](../src/motion-sequence.js)

**Problem:** A visual robot editor imports motion data from files. Corrupt or incorrectly typed input must not silently become a sequence that drives motor instructions.

**Approach:** `validateSequence` checks the file marker and pose array, enforces the current 30-pose hardware-oriented limit, requires four finite numeric angles per pose, checks duration bounds and configured joint limits, then returns fresh normalized pose objects. The accompanying `makeSampleSequence` provides a deterministic five-step demonstration.

**Tradeoffs:** Four actuated joints and a 30-pose limit are explicit v31 constraints, not a generic robot profile. Validation assumes a valid `joints` configuration supplied by the application. The importer clamps the *name length*, but it rejects rather than clamps unsafe motion values.

**Evidence:** `tests/logic.test.js` and `tests/edge-cases.test.js` include malformed formats, out-of-range values, nonnumeric values, boundary cases, and checks that imported arrays are not mutated.

**For the applicant to write in their own words:**
- Which parts did I personally write, refine, or direct? What assistance or libraries did I use?
- What import failure or student workflow caused me to add these checks?
- Why am I proud of this implementation, and what would I improve next?
