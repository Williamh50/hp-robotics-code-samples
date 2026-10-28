# Sample 2: Arduino sketch generation

**Source:** [`src/arduino.js`](../src/arduino.js)

**Problem:** Students can visually build a sequence without writing C++ or wiring code from scratch. The exported sketch needs to express recorded positions and mapping configuration predictably.

**Approach:** `validateServoMappings` checks four unique digital-pin assignments and servo endpoints. `angleToServo` converts the editor's nominal −90°…+90° space to servo values, respecting reversed direction. `buildSketch` outputs a sketch with recorded poses, smoothstep interpolation and serial `RUN`/`STOP` instructions.

**Tradeoffs / caveats:** The exporter does not validate all inputs itself and must only be called after validation. Serial STOP halts future scripted interpolation but does not de-energize motor power or physically stop a runaway actuator. It is not a hardware safety system. The reference controller and wiring need physical validation.

**Evidence:** Tests inspect pin constraints, reverse mapping, endpoint conversions, serial-gated execution code, and inclusion of motion records.

**For the applicant to write in their own words:**
- Which portions of the export pipeline did I design, write, debug, or modify?
- How did I decide to map visual joint movement into servo-specific endpoints?
- What was hardest about making an understandable no-code experience produce real controller code?
