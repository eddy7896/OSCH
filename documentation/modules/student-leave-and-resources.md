# Student leave and learning resources (plan, nothing built)

Status: **planned 2026-10-30; the owner's answers below are decisions, but an ADR must record the new access rules before code** (`documentation/phase5_plan.md`, tasks P5-10 and P5-11). Neither feature exists: the only leave in the system is staff leave, and there is no table or route for teaching material.

## 1. Owner's answers (2026-10-30)
| Question | Answer |
|---|---|
| Who approves a parent's leave request for their child? | **Both the class teacher and the Academic admin may**: either one decides, the first decision stands |
| May the parent send it with no connection? | **Yes**: saved on the phone and sent later, once (offline-sync rules) |
| Who sees an uploaded worksheet or workbook? | **The whole class** (every parent of that class and subject) |
| Which files may teachers upload? | **PDF, pictures, Word and PowerPoint**, up to 20 MB each |
| How long does a resource stay? | **Until the end of the school year** (then it leaves the phones; the record stays in the audit trail) |
| Comments under a worksheet, "like a forum" | **Yes**: parents of the class ask questions under each resource; see section 3a for the answers below |
| Name shown beside a parent's comment | **"Parent of {child}"**: the parent's first name and the child's first name, e.g. "Parvati, mother of Asha" (no surname, phone or email) |
| Who hides a comment | **The teacher and the Academic admin** (either); it stays in the audit record and the author is told |
| May a parent edit or delete their comment | **Yes, for 5 minutes after posting**; the first version stays in the audit record |
| Who is told of a new comment | **The teacher and everyone who has commented** under that resource |

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

## 3a. Comments under a resource (P5-11d, P5-11e)
- **What it is:** under each resource a list of comments, oldest first. Parents of that class and the teacher who uploaded it (and the Academic admin) can read and write; nobody else sees it. One level only: a reply is another comment that names who it answers; no threads of threads.
- **Who is shown:** every comment shows the author's role and name as the owner chose: a parent as "Parvati, mother of Asha", the teacher as "Tara Teacher" with a Teacher label. **This shows a child's first name to the other parents of the class.** The owner accepted that; it differs from the messaging plan's rule "no contact between two parents through the school" (`documentation/modules/messaging-and-notice-board.md`), which is about private chat. The ADR must say so in one place so the two plans do not contradict.
- **Writing:** a comment is saved on the phone first and sent once (a `clientId`, like leave); text only, up to 500 characters, no links turned into buttons, no attachments, no pictures. A parent can edit or delete their own comment in the 5 minutes after posting; after that it stays. The server's clock decides the time. Every comment, edit, deletion and hide is written to the audit trail with who and when, and the first version is kept.
- **Hiding:** the teacher or the Academic admin can hide a comment. A hidden comment shows to everyone as "Hidden by the school"; the author is told; the audit trail keeps the words. No one deletes a comment from the audit trail.
- **Telling people:** the teacher is told of each new comment; everyone who has already commented under that resource is told when another arrives (the existing notifications inbox and push, in each person's language). A person can switch this category off (the existing mute switch).
- **Office hours:** the school's rule that messaging between teachers and parents stays within office hours (`documentation/guardrails.md` section 3) is decision D4 below: a comment is always saved and shown at once, but the notification to the teacher waits until office hours begin, the same way the messaging plan decides.
- **Ends:** comments follow the resource: at the end of the school year both leave the phones; the audit trail keeps them.
- **Evals to write first:** E-RES-6 only parents of that class, the teacher and the Academic admin read or write comments (two-class and two-family tests); E-RES-7 a comment is audited with its first version, even after an edit or a delete; E-RES-8 the edit window is 5 minutes by the server's clock, whatever the phone's clock says; E-RES-9 a hidden comment's words are never sent to a parent, and the author is told; E-RES-10 the people told of a new comment are exactly the teacher and those who commented, and nobody who muted the category; E-RES-11 a comment sent twice (a lost reply) is one comment.

## 4. Order of work
1. ADR for both (access rules, who decides, the files and where they live).
2. P5-10a server (table, routes, attendance effect, notices, matrix), P5-10b Teacher app and web, P5-10c Parent app.
3. P5-11a server (upload and download addresses, table, routes, expiry at year end), P5-11b Teacher app, P5-11c Parent app, then P5-11d comments server and P5-11e comments in both apps.
Both build on the Parent app foundation (P5-6a) and the existing offline-sync engine.

## 5. Still open (small)
- **D1 Malware scanning** of uploaded files: none in version 1 (files are only ever downloaded by parents of that class), or a scanning step before a file is made visible?
- **D2 Retention:** answered: until the end of the school year.
- **D3 Questions about a resource** are now answered by the comments (section 3a), so messaging (P5-3) is not needed for them.
- **D4 Office hours for comment notifications:** hold the teacher's notification until office hours (recommended, as the messaging plan proposes), or tell the teacher at once?
- **D5 Report button:** the owner chose hiding by the teacher or the Academic admin; should a parent also have a Report button that tells them? Not planned unless asked.
