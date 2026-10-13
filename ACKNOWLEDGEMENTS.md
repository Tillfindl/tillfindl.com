# Acknowledgements

## Eigen's animations

The face, foot scan and treadmill in the Eigen scene (`src/scripts/eigen/`) are ported from
Eigen's own animation engine, `eigen-motion`, by Till Findl and the Eigen team.

## Head scan

The face in the Eigen scene is sampled from the head scan of Lee Perry-Smith, by Infinite
Realities, as published with the three.js examples
(`examples/models/gltf/LeePerrySmith/LeePerrySmith.glb`), licensed under
[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). It was
turned into a point cloud and a CPAP mask was modelled onto it (`tools/face-cloud.py`).

## Thinking Orbs

`src/scripts/eigen/engine/states/orb/core.ts` is ported from Thinking Orbs by Jakub Antalik
(https://github.com/Jakubantalik/Libraries.dev, npm `thinking-orbs` 0.3.2).

```
MIT License

Copyright (c) 2026 Jakub Antalik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## three.js

Rendering uses [three.js](https://threejs.org), MIT License, Copyright © 2010-2026 three.js
authors.
