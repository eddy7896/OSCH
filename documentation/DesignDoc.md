> **Historical (v0.2 brainstorm).** Superseded where it conflicts with `design-system/` (tokens, type, components) and `design_system_spec.md` (engineering index). Still the reference for product architecture, per-app UX and ERP navigation structure.

# OruSchools Design Language System

## Product Architecture & UX Direction — v0.2

## 1. Product Architecture

OruSchools will operate as a **large modular ERP ecosystem** backed by one shared platform and design language.

The system consists of:

### Web

**OruSchools ERP**
Primary users:

* Principal
* School Administrator
* HR
* Accounts / Finance
* Management
* Other authorized administrative roles

Purpose:

* Monitoring
* Administration
* Configuration
* Reporting
* Finance
* HR
* Academics
* Transport
* Inventory
* Approvals
* Analytics

The ERP should behave as **one large application with modules**, rather than separate workspaces.

---

# 2. Mobile Application Family

Each major user class receives a dedicated mobile application.

This is preferable to a single role-switching application because each persona has significantly different workflows, information density, security needs, and UX expectations.

## App 1 — OruSchools Staff

For **non-teaching school employees**.

Example users:

* Office staff
* Account assistants
* Administrators
* HR staff
* Lab assistants
* Support staff
* Other non-teaching employees

Primary workflows:

* Personal attendance
* Check-in / check-out
* Leave requests
* Leave balance
* Shift / work schedule
* Assigned tasks
* School announcements
* Approval requests where applicable
* Daily operations
* Personal profile
* Documents
* Notifications

### UX Personality

Professional but lightweight.

It should feel considerably simpler than the ERP.

Think:

**Employee utility app + school operations companion**

The home screen should answer:

> What do I need to do today?

---

# 3. App 2 — OruSchools Teacher

For teaching staff.

This is likely to become the most workflow-intensive mobile application in the ecosystem.

Primary modules:

### Teacher Attendance

* Personal check-in
* Check-out
* Attendance history
* Leave
* Substitute status

### Student Attendance

Support:

* Present
* Absent
* Late
* Excused
* Medical
* Leave
* Half Day

Statuses should be configurable by the school.

Teachers should normally work using an **exception-based workflow**:

`Mark everyone Present → change exceptions`

rather than individually marking thirty students.

---

### Gradebook

Teachers should be able to:

* Select class
* Select subject
* Select assessment
* Enter marks
* Enter grades
* Add remarks
* Save drafts
* Work offline when possible
* Sync changes later

The grade-entry interface should prioritize extremely fast repetitive input.

---

### Classes

Teacher dashboard shows:

`Today's Classes`

Example:

8:45
Class 7A
Mathematics

10:00
Class 8B
Mathematics

12:15
Class 6A
Mathematics

Each class becomes a workflow entry point.

---

### Teacher–Parent Communication

Teachers can:

* Send announcements
* Message parents
* View conversation history
* Share homework
* Send academic remarks
* Send attachments
* Send class-wide messages where permissions allow

Strong permission controls should distinguish:

`Individual Parent`

from

`Entire Class`

---

### Teacher Home Screen Principle

Do not create a mini ERP.

Instead, organize the interface around:

**Today**

For example:

```text
Good morning, Ayesha

Tuesday, 22 September

--------------------------------

NEXT CLASS

Class 7A
Mathematics
8:45 – 9:30

[Take Attendance]

--------------------------------

TODAY

8:45   Class 7A
10:00  Class 8B
11:30  Free Period
12:15  Class 6A

--------------------------------

TO DO

• Submit Class 8B attendance
• Grade Unit Test — Class 7A
• 3 parent messages
```

The application becomes a **teacher's operational companion**, not a dashboard full of statistics.

---

# 4. Parent Application

Maintain a dedicated parent experience.

Recommended working name:

**OruSchools Parent**

Core areas:

* Child overview
* Attendance
* Academic performance
* Homework
* Announcements
* Teacher communication
* Fees
* Receipts
* Transport tracking
* Timetable
* Calendar
* Documents

Parent UX should be noticeably warmer than the Teacher or ERP applications.

The home screen should answer:

> How is my child doing today?

Rather than presenting administration terminology.

---

# 5. Driver Application

Maintain a highly specialized driver application.

Recommended:

**OruSchools Driver**

This application should intentionally share very little screen architecture with the other apps.

Primary functions:

* Start route
* Student boarding
* Student drop-off
* Route progress
* Emergency action
* School communication
* Vehicle status

### UX Rule

While a route is active:

**No small interaction targets.**

Buttons should be approximately:

`56–72px`

and screens should contain very few simultaneous actions.

---

# 6. Shared Platform, Different Experiences

The applications should NOT look identical.

They should look like members of the same family.

Shared:

* Typography
* Color semantics
* Icon style
* Radius philosophy
* Buttons
* Forms
* Status indicators
* Notifications
* Offline indicators
* Motion language
* Accessibility principles

Different:

* Navigation
* Density
* Card composition
* Homepage architecture
* Information hierarchy

This produces:

```text
                    ORUSCHOOLS
                         │
                Shared Design System
                         │
      ┌──────────┬───────┼────────┬─────────┐
      │          │       │        │         │
     ERP       Staff   Teacher   Parent   Driver
     Web       Mobile   Mobile   Mobile   Mobile
```

---

# 7. OruSchools ERP Structure

The desktop product should use persistent module navigation.

Recommended hierarchy:

```text
OruSchools
School Name
────────────────────

OVERVIEW
Dashboard

ACADEMICS
Students
Classes
Subjects
Attendance
Timetable
Examinations
Gradebook

PEOPLE
Teachers
Staff
Departments

HR
Attendance
Leave
Payroll
Recruitment

FINANCE
Fees
Payments
Expenses
Payroll
Ledger
Reports

COMMUNICATION
Announcements
Messages
Notifications

TRANSPORT
Vehicles
Routes
Drivers
Students

OPERATIONS
Inventory
Assets
Procurement
Visitors

REPORTS
Academic Reports
Attendance Reports
Financial Reports
HR Reports

ADMINISTRATION
Approvals
Roles & Permissions
School Settings
Integrations

────────────────────
Support
Profile
```

Modules should automatically disappear when the user lacks permission.

Therefore:

**Navigation itself becomes part of RBAC.**

Do not show inaccessible modules and then return an authorization error when they are clicked.

---

# 8. Permission-Aware UI

Permissions should affect more than routes.

Example:

### Principal

Can see:

```text
Dashboard
Academics
Teachers
Staff
Finance
Transport
Reports
Approvals
```

### Accountant

Might see:

```text
Dashboard
Fees
Payments
Expenses
Ledger
Reports
```

### HR Manager

Might see:

```text
Dashboard
Staff
Attendance
Leave
Payroll
Recruitment
```

The underlying design system should therefore support:

`Module Permission`

↓

`Page Permission`

↓

`Action Permission`

Example:

```text
Finance
 └── Fees
      ├── View
      ├── Create
      ├── Edit
      ├── Refund
      └── Export
```

The interface should only expose actions available to that user.

---

# 9. Principal Dashboard Role

The Principal Dashboard should be primarily a:

## Monitoring Interface

rather than an operational workspace.

The dashboard answers:

### Students

Are students attending?

### Teachers

Are teachers present?

### Finance

Are fees being collected?

### Academics

Are classes and assessments progressing?

### Transport

Is transportation running normally?

### Operations

Does anything require attention?

---

## Dashboard Philosophy

Instead of:

`20 things the principal can do`

show:

`5 things the principal needs to know`

Example dashboard hierarchy:

```text
Good morning, Principal
Tuesday, 22 September

School operating normally ●

------------------------------------------------

1,284            91.4%            94.8%           ₹18.2L
Students        Attendance       Staff           Fees Collected

------------------------------------------------

ATTENDANCE                     REQUIRES ATTENTION

[7-day attendance chart]       12 Pending Approvals
                               2 Absent Teachers
                               1 Delayed Bus
                               3 Attendance Classes Missing

------------------------------------------------

FINANCE                        SCHOOL OPERATIONS

82% Fees Collected             12 / 12 Buses Active
₹4.28L Outstanding             26 / 28 Classes Reported

------------------------------------------------

TODAY

09:14 Attendance submitted by Class 7A
09:03 Route 4 reached school
08:58 Teacher leave request submitted
```

The principal then enters modules for deeper actions.

---

# 10. White-Label Strategy

OruSchools should support two commercial branding modes.

## Mode A — OruSchools Powered

School uses the standard OruSchools applications.

Example:

**OruSchools Teacher**

Inside the app:

```text
Delhi Public School
Powered by OruSchools
```

School can configure:

* School logo
* Primary brand color
* School name
* School imagery where applicable

However:

App icon:
OruSchools

Store listing:
OruSchools

App name:
OruSchools Teacher / Parent / Staff etc.

This greatly simplifies deployment and upgrades.

---

# 11. Mode B — Full White Label

Premium/custom option.

Example:

Instead of:

`OruSchools Parent`

the application might become:

`Green Valley Connect`

Customizable:

* Application name
* Application icon
* Splash screen
* School logo
* Primary branding
* Secondary branding
* Android package identity
* iOS bundle identity
* Play Store listing
* App Store listing
* Push notification identity
* Branded login screens

But all applications still use the underlying:

**OruSchools Design System**

This is important.

White labeling should change the **identity layer**, not the UX foundation.

---

# 12. OruSchools Core Brand

Before supporting school themes, create a canonical:

## OruSchools Core Theme

Recommended direction:

### Brand Personality

Modern
Trustworthy
Academic
Technological
Calm
Approachable

Avoid traditional school-software visual patterns such as:

* Strong royal blue everywhere
* Excessive gradients
* Extremely colorful cards
* Oversized dashboard icons

OruSchools should feel closer to a modern SaaS operating platform.

---

# 13. Suggested Core Brand Color Direction

I recommend using an **indigo / blue-violet core** rather than generic SaaS blue.

Example starting point:

```text
Oru Indigo 50    #EEF2FF
Oru Indigo 100   #E0E7FF
Oru Indigo 200   #C7D2FE
Oru Indigo 300   #A5B4FC
Oru Indigo 400   #818CF8
Oru Indigo 500   #6366F1
Oru Indigo 600   #4F46E5
Oru Indigo 700   #4338CA
Oru Indigo 800   #3730A3
Oru Indigo 900   #312E81
```

Primary:

`#4F46E5`

This creates enough distinction from the typical dark-blue school ERP while remaining professional.

---

# 14. Offline Strategy

Offline support should be implemented **where workflow interruption would be particularly damaging**.

Do not attempt to make every feature offline.

## High Priority Offline

### Teacher

* Student attendance
* Teacher attendance
* Grade entry drafts
* Today's timetable
* Student roster

### Driver

* Route information
* Student passenger list
* Boarding/drop records
* Emergency contact data

### Staff

* Personal attendance
* Leave request drafts
* Daily assigned tasks

### Parent

Primarily cache:

* Child overview
* Timetable
* Announcements
* Latest attendance
* Recent academic results

Payments and sensitive transactional workflows should generally require connectivity.

---

# 15. Shared Sync Model

Every mobile application should use the same status language:

### Synced

`✓ Synced`

### Saved Locally

`✓ Saved on device`

### Pending

`↑ 4 changes pending`

### Syncing

`↻ Syncing…`

### Offline

`Cloud off — You're offline`

### Failed

`! Sync failed`

`Retry`

This pattern should become a recognizable OruSchools behavior across applications.

---

# 16. Screen Density Strategy

The ecosystem now has four functional density levels.

## ERP Compact

Used for:

* Data grids
* Accounts
* HR
* Student lists

32–36px controls.

---

## ERP Comfortable

Used for:

* Dashboard
* Settings
* Reports
* Configuration

36–40px controls.

---

## Mobile Touch

Teacher / Staff / Parent.

48px minimum target.

---

## Driver Safety

56–72px minimum primary controls.

---

# 17. Recommended Mobile Navigation

## Teacher App

Bottom navigation:

```text
Today
Classes
Messages
More
```

Attendance and Gradebook should normally be entered through a class rather than permanently occupying separate bottom tabs.

---

## Staff App

```text
Home
Attendance
Tasks
More
```

---

## Parent App

```text
Home
Academics
Messages
Payments
More
```

---

## Driver App

Avoid a traditional five-tab application during active routes.

Primary structure:

```text
Today
Routes
More
```

Starting a route switches the application into a dedicated:

**Active Route Mode**

---

# 18. Teacher App Information Architecture

Recommended hierarchy:

```text
Teacher App

├── Today
│   ├── Next Class
│   ├── Schedule
│   ├── Tasks
│   └── Notices
│
├── Classes
│   └── Class 7A
│       ├── Overview
│       ├── Attendance
│       ├── Gradebook
│       ├── Students
│       └── Communication
│
├── Messages
│   ├── Parents
│   └── School
│
└── More
    ├── My Attendance
    ├── Leave
    ├── Timetable
    ├── Documents
    ├── Announcements
    ├── Profile
    └── Settings
```

This hierarchy will keep the app understandable even as functionality grows.

---

# 19. Product Design Rule

A useful design rule for the entire system should be:

### ERP

**Information → Insight → Module**

### Teacher App

**Schedule → Task → Completion**

### Staff App

**Today → Responsibility → Completion**

### Parent App

**Child → Information → Action**

### Driver App

**Route → Student → Safety**

This gives every application a distinct UX purpose while allowing them to share one DLS.

---

# 20. Current Architecture Decision

The OruSchools ecosystem should therefore be structured as:

```text
                         OruSchools Platform

                       PostgreSQL / Platform APIs
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
        Shared Identity   Shared Permissions   Shared Events
              │                │                  │
              └────────────────┼──────────────────┘
                               │
                      OruSchools Design System
                               │
       ┌──────────┬────────────┼───────────┬───────────┐
       │          │            │           │           │
      ERP       Teacher       Staff      Parent      Driver
      Web        App           App         App         App
```

Tenant themes sit above the shared design-system tokens rather than modifying individual components.
