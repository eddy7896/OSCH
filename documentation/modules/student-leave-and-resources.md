# Student leave and learning resources (plan, nothing built)

Status: **planned 2026-10-30; the owner's answers below are decisions, but an ADR must record the new access rules before code** (`documentation/phase5_plan.md`, tasks P5-10 and P5-11). Neither feature exists: the only leave in the system is staff leave, and there is no table or route for teaching material.

## 1. Owner's answers (2026-10-30)
| Question | Answer |
|---|---|
| Who approves a parent's leave request for their child? | **Both the class teacher and the Academic admin may**: either one decides, the first decision stands |
| May the parent send it with no connection? | **Yes**: saved on the phone and sent later, once (offline-sync rules) |
| Who sees an uploaded worksheet or workbook? | **The whole class** (every parent of that class and subject) |
| Which files may teachers upload? | **PDF, pictures, Word and PowerPoint**, up to 20 MB each |

## 2. Student leave (P5-10)
- **Parent app:** a "Leave for {child}" screen: first and last day, half a day for a single day, a reason (up to 300 characters). It shows the child's earlier requests with their state (waiting, approved, declined). Saved on the phone first with a `clientId`, as staff leave is.
- **Gateway:** `POST /v1/student-leave` (the parent's `linked` scope: only their own child; the child's school comes from the token, never the body), `GET` (a parent: own children's requests; the class teacher: requests for the classes they are class teacher of; the Academic admin: school), `POST /:id/approve` and `/:id/decline` (class teacher of that child's class, or the Academic admin; the first decision stands and a second one is refused with the same answer as a replay). Every write is audited in its own transaction.
- **When approved:** the child's days in that range are marked **Leave** in the class attendance (the seven fixed statuses already include Leave). A day the teacher has already taken is not changed; a locked day is not changed (the Academic admin's correction route exists for that). Declining writes nothing to attendance.
- **Teacher app:** a "Student leave" list under More (waiting first), Approve and Decline; works from the phone's copy, the decision is sent when online and shows if the other approver decided first. **Web:** the Academic admin sees all requests on a Student leave page.
- **Notices:** the class teacher is told of a new request; the parent is told of the decision (in the existing notifications inbox, in the reader's language).
- **Rules it must keep:** a parent can create only for a linked child (E-RBAC, two-family test); overlapping requests for the same child are refused; a request is final once decided; a cancelled request (by the parent, while waiting) is allowed.
- **Evals to write first:** E-SL-1 a parent cannot create or read another family's child's request; E-SL-2 replaying a request any number of times leaves one; E-SL-3 only the class teacher of that class or the Academic admin decides, and not twice; E-SL-4 approval marks Leave in attendance without touching a taken or locked day; E-SL-5 every write is audited.

## 3. Learning resources (P5-11)
- **Teacher app:** on a class and subject she teaches, **Add a resource**: title, a short note, and a file (PDF, JPG, PNG, Word, PowerPoint, up to 20 MB). She sees and can remove her own. Upload needs a connection (a file is not queued: the screen says so in words).
- **Storage:** the private bucket already used for student documents, under `schools/<school>/resources/<class>/<id>/`; the gateway hands out a short-lived upload address and later a short-lived download address; nothing is public. The type and size are checked by the gateway before the upload address is given and again against the stored object; a file that fails is never made visible. **Scanning for malware is not in this plan** and is a risk to decide (D1 below).
- **Parent app:** a "Resources" list on the child's home: the class's resources by subject, newest first, with the teacher's name and date; tapping downloads and opens the file (a file already opened is kept on the phone for offline reading; the list itself is cached).
- **Gateway:** `POST /v1/resources/uploads` (class teacher or teacher of that subject in that class; returns the address), `POST /v1/resources` (records it once the file is there), `GET /v1/resources?classId=` (a parent: only their linked child's class; a teacher: her classes; the Academic admin: school), `GET /v1/resources/:id/download`, `DELETE /v1/resources/:id` (the uploader or the Academic admin). Audited.
- **Whole class:** visible to every parent whose child is placed in that class this year; a child who moves class stops seeing the old class's new resources and keeps nothing offline beyond what is cached.
- **Evals to write first:** E-RES-1 a parent sees only resources of their linked child's class (two-family and two-class tests); E-RES-2 a teacher may add only for a class and subject she teaches; E-RES-3 type and size limits hold, including a lying content type; E-RES-4 a download address is short-lived and school-scoped; E-RES-5 every add and removal is audited.

## 4. Order of work
1. ADR for both (access rules, who decides, the files and where they live).
2. P5-10a server (table, routes, attendance effect, notices, matrix), P5-10b Teacher app and web, P5-10c Parent app.
3. P5-11a server (upload and download addresses, table, routes), P5-11b Teacher app, P5-11c Parent app.
Both build on the Parent app foundation (P5-6a) and the existing offline-sync engine.

## 5. Still open (small)
- **D1 Malware scanning** of uploaded files: none in version 1 (files are only ever downloaded by parents of that class), or a scanning step before a file is made visible?
- **D2 Retention:** how long a resource stays (until the school year ends, or until removed)?
- **D3 Teacher-to-parent reply:** a parent who wants to ask about a resource uses messaging (P5-3) once it exists; nothing is built for it here.
