Launch (splash) screens for the five apps: a full-bleed field in the app's colour (`app-*` tokens), the mark centred at 160dp, and the app lockup 48dp above the bottom edge.

- `splash-<app>.svg` / `-ios-1290x2796.png` / `-android-1080x2400.png` — the static screen, for reference, store screenshots and any platform that needs a full image.
- `splash-icon-white.png` (ERP, Teacher, Staff, Parent) and `splash-icon-ink.png` (Driver, ink #151838 on #F5B400) — 1152×1152 transparent, the mark centred at 640px: the centre image for iOS LaunchScreen and Android 12+ `windowSplashScreenAnimatedIcon` (288dp, content inside the 2/3 safe circle).
- `splash-branding-<app>.png` — 800×320 (200×80dp @4x) bottom branding image; white, Driver in ink.
- `splash-mark-white.lottie.json` / `splash-mark-ink.lottie.json` — the 1.3 s animated mark (Lottie 5.7, 60 fps, 576×576). Same framing as the splash icon, so frame 0 is identical to the static screen. Render it at 288×288dp, centred, on the app colour.
- `splash-<app>-animated.mp4` — what the full animated screen should look like (reference only, not for shipping). `splash-all-apps-preview.gif` — all five side by side.
