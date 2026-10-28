# HP Robotics Studio — Selected JavaScript Code Samples

**Three real source files from HP Robotics Control Console v31 Engineering Release**, curated for a developer application. This is a **code-sample repository, not a complete runnable web app**. The standalone app requires additional HTML, calibration, and geometry assets intentionally not included here.

## Start here

| Code sample | What it demonstrates | Engineering commentary |
| --- | --- | --- |
| [Motion sequence validation](src/motion-sequence.js) | Strict JSON input checks, joint-angle constraints, non-mutating normalization, sample data | [Why I selected it](docs/01-motion-sequence.md) |
| [Arduino code generation](src/arduino.js) | Pin-mapping validation, servo-angle conversion, sketch generation, run/stop serial gating | [Why I selected it](docs/02-arduino-generation.md) |
| [WebGL 3D renderer](src/renderer.js) | WebGL shader setup, matrix transforms, articulated geometry, picking and 3D control UI | [Why I selected it](docs/03-renderer.md) |

## Run the tests

Requirements: **Node.js 20 or newer**. No external packages required.

```bash
npm test
```

Tests cover motion import validation, shape and range checks, immutability, servo pin selection, angle conversion and generated sketch content. The 3D renderer requires browser DOM and geometry assets and is **not** covered by these Node-based unit tests.

## Demo and project context

HP Robotics Studio is an educational HTML5 application in which students position an articulated robot, record motion sequences, preview the movement and generate an Arduino sketch for use with a physical robot. It was built as part of a robotic-arm teaching product being pilot-tested with students.

Portfolio website: https://www.hpsyntheticstudio.com/

## Authorship and AI-assisted development

This repository reproduces source files from the HP Robotics Studio project. **Before submitting it**, the applicant should personalize the accompanying sample narratives to accurately state which implementation details they personally wrote, directed, edited, debugged, tested, or generated with AI assistance. The notes identify behavior verified by inspection; they are **not** an authorship certification. No contribution percentages are asserted.

## Important limitations

- This is an educational prototype, not a safety-certified robotics controller. Arduino `STOP` is a software command, **not** an emergency stop or power disconnect.
- The generator and its input checks still require hardware testing and end-to-end validation before classroom or retail deployment. `buildSketch` trusts its inputs; callers must validate and normalize data first.
- Renderer behavior is not established by the included Node tests; full browser/hardware acceptance testing is outside this sample repository.
- The application uses some geometry assets not included here to avoid publishing unnecessary original product files. The included renderer shows the technique but does not launch on its own.
- The code is shared for hiring evaluation. **No open-source license is granted by default.** Confirm that you have the rights to publicly share every file, especially if any work overlaps an employer or client contract.

## Suggested GitHub publishing steps

1. Review the code and the authorship notes; remove any file you are not authorized to publish.
2. Create a new **public** repository named `hp-robotics-code-samples` on your own GitHub account.
3. Upload this repository's contents, keeping the `src`, `tests`, and `docs` folders.
4. In the GitHub repository, run or locally verify `npm test`, then link reviewers directly to the individual `src/*.js` files.
5. Replace the sample notes with your own words before applying to Alley; they explicitly request authentic personal responses.
