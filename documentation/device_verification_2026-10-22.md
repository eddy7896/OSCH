# Device verification, 2026-10-22 (P1-0c)

Run on this Mac with the iOS 27 simulator (iPhone 17) and the Android emulator (Medium Phone, API 37), debug builds of all four Flutter apps from the same working tree (with the new home-screen names). Evidence is in the build logs and screenshots of that run (not committed).

| App | iOS simulator | Android emulator |
|---|---|---|
| Teacher | built, installed, launched; home-screen name **Oru Teacher**; renders in Noto Sans | built, installed, launched; label **Oru Teacher** (read from the APK) |
| Staff | built, installed, launched; **Oru Staff** | built, installed, launched; **Oru Staff** |
| Parent | built, installed, launched; **Oru Parent** | built, installed, launched; **Oru Parent** |
| Driver | built, installed, launched; **Oru Driver**; Noto Sans, dark mark on the yellow icon | built, installed, launched; **Oru Driver** |

- **iOS home screen (screenshot inspected):** four distinct icons (indigo, teal, red-orange, yellow) with their names fully visible under them. The old "OruSchools Teacher" name was the one that truncated.
- **Android:** each APK builds and installs, the launcher label is right, the app starts and no crash is logged (`FATAL EXCEPTION` count 0, Flutter logging present). A clean screenshot of the first screen was **not** obtained: the headless, software-rendered emulator on this Mac raises "System UI isn't responding" over the app, and the app's text can be seen behind the dialog. This is the emulator, not the app, but it is not proof of a good first screen. Check on a physical phone or with the emulator window open (`flutter emulators --launch Medium_Phone_API_37.0`).

## Still not verified
- A physical iPhone and Android phone (the owner has none available for now; do it at the pilot).
- Urdu/right-to-left rendering on a device.
- The Driver app's 64 px targets on a real screen (it has no features yet).
- Release (not debug) builds, signing, store assets (Phase 4, P4-8).
