#!/usr/bin/env node
// Prepares per-app launcher icon sources from documentation/brand-assets (design system D10):
//   apps/mobile-<role>/assets/icon/app-icon-1024.png        full-bleed square (iOS / legacy Android / stores), copied as-is
//   apps/mobile-<role>/assets/icon/adaptive-foreground.png  transparent 1024 canvas, mark at 55% width (inside the Android
//                                                           adaptive safe zone: 66/108 = 61%), mark colour per brand guide
// Then run `dart run flutter_launcher_icons` in each app (config lives in its pubspec.yaml).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = resolve(root, "documentation/brand-assets");
// Brand guide: white mark on every app colour except Driver (school-bus yellow), which takes the Ink mark.
const APPS = { teacher: "oruschools-mark-white.svg", staff: "oruschools-mark-white.svg", parent: "oruschools-mark-white.svg", driver: "oruschools-mark-ink.svg" };
const SIZE = 1024;
const MARK = Math.round(SIZE * 0.55);

for (const [role, markFile] of Object.entries(APPS)) {
  const out = resolve(root, `apps/mobile-${role}/assets/icon`);
  mkdirSync(out, { recursive: true });
  copyFileSync(resolve(brand, `App icons/app-icon-${role}-1024.png`), resolve(out, "app-icon-1024.png"));
  // The brand SVGs include clear-space padding: trim to the VISIBLE mark first, then scale it to 55% of the canvas
  // (matches the full-bleed app icons, where the visible mark is ~55% wide).
  const trimmed = await sharp(readFileSync(resolve(brand, `Logos/${markFile}`)), { density: 1152 }).png().trim().toBuffer();
  const mark = await sharp(trimmed).resize(MARK, MARK, { fit: "inside" }).png().toBuffer();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(resolve(out, "adaptive-foreground.png"));
  console.log(`mobile-${role}: app-icon-1024.png + adaptive-foreground.png (${markFile})`);
}
