# Spikes (throwaway experiments that settled a design question)

Nothing here ships. Each folder reproduces one experiment from `documentation/phase2_spikes.md`.

- `receipt-numbering/`: Data Connect on the local emulator. Run from that folder:
  `../../../node_modules/.bin/firebase dataconnect:compile` (generates `gen/`), then
  `../../../node_modules/.bin/firebase emulators:start --only dataconnect --project demo-spike` in one terminal and
  `ln -s ../../../node_modules node_modules && node run.cjs` in another. (The emulator cannot prove real concurrency, see the document.)
- `pdf-text/`: `npm install --no-save skia-canvas` at the repo root, then `node tools/spikes/pdf-text/skia.mjs`; it writes `skia.pdf` and `skia.png` into the current folder.
