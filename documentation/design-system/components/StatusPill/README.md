# StatusPill

Shows a student's attendance status with an icon and a word, so it reads without colour.

**Provide:** `status` — `present`, `absent`, `late`, `leave`, `medical`, `halfday`, `excused`; `interactive` + `onClick` when tapping it changes the status; optional `label` for a school's renamed status.

- Colours: Present `success`, Absent `danger`, Late `warning`, Leave `info`, Medical `purple`, Half Day `teal`, Excused neutral. Never re-map them per school.
- The attendance screen is exception-based: everyone starts Present, the teacher taps only the exceptions.
- Always keep the word. Green and red alone are not enough.
