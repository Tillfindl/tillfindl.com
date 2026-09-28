# Orbs

The dot orb that morphs beside the page, one shape per chapter.

- `bounceback-orbs.ts` is the Bounceback orbs web runtime, copied unchanged from
  `bounceback-morph-bench/orbs/web/`. It has no dependencies and draws on a 2D canvas.
- `tillfindl.json` holds the states (`orb`, `solving`, `logo`, `heart`, `foot`), each the same
  306 dots. It is built in `bounceback-morph-bench` with `npm run orbs:tillfindl`
  (shapes in `orbs/build/sites/tillfindl.ts`) and copied here.

To change a shape, edit it in the bench, rebuild, and copy both files over again.
