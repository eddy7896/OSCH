# OruSchools Modules Documentation

This directory contains modular, detailed documentation for specific feature sets within the OruSchools platform.

## Available Modules

### 1. Finance & Operations
- *(Placeholder)* Covers fee ledgers, invoicing, and payroll integrations.

### 2. Academic Administration
- *(Placeholder)* Covers master scheduling, timetable generation, and exams.

### 3. HR & Leave Management
- *(Placeholder)* Covers staff leave requests, the substitution matrix algorithm, and payroll deduction logic.

### 4. Communication & Messaging
- *(Placeholder)* Covers 1:1 direct messaging, broadcast push notifications, and community groups.

### 5. Transport Utility
- *(Placeholder)* Covers live bus tracking, GPS polling, and student manifest management.

### 6. Offline sync
- [offline-sync.md](offline-sync.md): the server pieces Phase 3 provides (idempotent submissions, tombstones) and the conflict rule for every Phase 3 entity. The engine is Phase 4.

## Contributing
When adding a new module to the system, create a corresponding `[module_name].md` file in this directory and document its specific workflows, data models, and edge cases.
- [messaging-and-notice-board.md](messaging-and-notice-board.md): the plan (not built) for the class broadcast to parents, one-on-one student conversations and the school notice board; waits for the messaging ADR.
- [student-leave-and-resources.md](student-leave-and-resources.md): the plan (not built) for a parent asking leave for their child, and teachers' worksheets and workbooks in the Parent app; the owner's answers are recorded there.
- [academic-insights-engine.md](academic-insights-engine.md): the plan (not built) for the separate Academic Insights Engine: J&K calendar profiles, NEP 2020 and board policy packs, teacher-authored workbooks, and 13 progress visualisations; decision record ADR-0017 (proposed).
- [children-data-protection.md](children-data-protection.md): the plan (not built) for reducing DPDP Act 2023 risk for children's data: roles, consent, minimisation, retention, security, breach response, sub-processors; tasks P6-5a to P6-5h. Not legal advice.
- [../templates/project-bootstrap-prompt/README.md](../templates/project-bootstrap-prompt/README.md): a reusable multi-document prompt kit (interview, architecture, documents, ADRs, guardrails, hallucination checks, drift, evals, git and PR system) for starting a new company project the way this one was built.
