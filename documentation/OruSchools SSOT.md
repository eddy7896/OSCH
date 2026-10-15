# OruSchool

# Platform Specification & Architecture

## Executive Summary

This document outlines the architecture, core modules, and strategic blueprint for a scalable, multi-tenant cloud-based School Management System ***OruSchools***. It is designed specifically for regions with unpredictable internet connectivity (e.g., Jammu and Kashmir), utilising an **Offline-First** mobile approach and a **Two-Pillar** system structure separating dense administrative tasks from everyday user engagement.

---

## 1. System Architecture: The Two-Pillar Approach

The system acts as both an **Enterprise ERP** (System of Record) and a **Communication Bridge** (System of Engagement).

- **Pillar 1: Web Admin (ERP):** Built with **React / Next.js**. Designed for complex, heads-down administrative workflows (payroll, complex timetables, fee generation).
- **Pillar 2: Mobile Ecosystem (Bridge):** Built with **Flutter**. Highly optimized cross-platform native apps for Teachers, Parents, and Transport drivers.

### 1.1 Two-Pillar Data Flow Diagram

```mermaid
graph TD
    subgraph Enterprise ERP Web / Next.js
        F[Financial Ledgers]
        HR[HR & Payroll]
        MS[Master Scheduling]
        AS[Admission Setup]
    end

    subgraph Core Infrastructure
        API[Node.js / API Gateway]
        DB[(Multi-Tenant PostgreSQL)]
    end

    subgraph Communication Bridge Mobile / Flutter
        PN[Push Notifications]
        DM[Direct Messaging]
        LT[Live Bus Tracking]
        QG[Quick Grade View]
    end

    F & HR & MS & AS <--> API
    PN & DM & LT & QG <--> API
    API <--> DB
```

---

## 2. Multi-Tenant Ecosystem

To ensure data privacy and a customized experience, the platform utilizes a single database with isolated schemas per school.

### 2.1 Ecosystem Hierarchy Diagram

```mermaid
graph TD
    SA{Super Admin SaaS Owner} -->|Manages Subscriptions & Billing| CloudDB[(Unified Cloud DB)]

    CloudDB -->|Schema 1| SchoolA[School A Instance]
    CloudDB -->|Schema 2| SchoolB[School B Instance]

    SchoolA --> AdminWebA[Web Admin Dashboard]
    SchoolA --> TeacherAppA[Teacher App iOS/Android]
    SchoolA --> ParentAppA[Parent App iOS/Android]
    SchoolA --> DriverAppA[Transport App iOS/Android]
```

---

## 3. Component Hierarchy

This defines how features are categorized across the different user interfaces within a single school tenant.

```mermaid
graph TD
    Root[Single School Tenant]

    Root --> Web[Web Admin Apps React/Next.js]
    Root --> Staff[Mobile Staff Apps Flutter]
    Root --> Users[Mobile User Apps Flutter]

    Web --> SysConfig[System Configuration RBAC, Users]
    Web --> Finance[Finance Management Ledger, Payroll]
    Web --> AcadAdmin[Academic Admin Timetables, Exams]

    Staff --> TeacherHub[Teacher Hub Attendance, Grades]
    Staff --> DriverUtil[Driver Utility Live GPS, Manifest]

    Users --> ParentPortal[Parent/Student Portal Fees, Academics, Chat]
```

---

## 4. Role-Based Access Control (RBAC)

Administrative staff are strictly siloed based on the principle of least privilege to protect sensitive financial and student data.

| Role | Global Metrics | Financial Data | Student Attendance | Academics & Grades | System Settings |
| --- | --- | --- | --- | --- | --- |
| **Principal / Director** | Full Access | Read-Only | Read-Only | Read-Only | Read-Only |
| **Finance Admin (Bursar)** | Finance Only | Full CRUD | No Access | No Access | No Access |
| **Academic Admin** | Academics Only | No Access | Full CRUD | Full CRUD | No Access |
| **IT / System Admin** | System Health | No Access | No Access | No Access | Full CRUD |

## 4.1 RBAC Permission Matrix

```mermaid
graph LR
    subgraph Roles
        P[Principal]
        FA[Finance Admin]
        AA[Academic Admin]
    end
    subgraph Modules
        Fin[Financial Data]
        Acad[Academic & Grades]
        Att[Attendance]
    end
    P -.->|Read Only| Fin
    P -.->|Read Only| Acad
    P -.->|Read Only| Att
    FA ==>|Full Access| Fin
    AA ==>|Full Access| Acad
    AA ==>|Full Access| Att
```

---

## 5. Offline-First Sync Architecture (Crucial for Low Network Zones)

To support users in regions like Jammu & Kashmir with 2G fallback or network blackouts, the Flutter apps rely on local persistence and a background sync queue. Users never see a loading spinner waiting for an API response.

### 5.1 Offline Sync Data Flow

```mermaid
sequenceDiagram
    participant User as Teacher (Flutter App)
    participant LocalDB as Local SQLite / Isar
    participant Queue as Background Sync Queue
    participant API as Cloud API Gateway
    participant DB as PostgreSQL DB

    User->>LocalDB: Mark Attendance (Offline/Online)
    LocalDB-->>User: UI updates instantly (Optimistic)
    LocalDB->>Queue: Add mutation to queue

    alt Network Disconnected
        Queue-xAPI: Connection Failed (Wait)
    else Network Reconnected
        Queue->>API: Bulk push pending actions
        API->>DB: Write to database
        DB-->>API: Confirm success
        API-->>Queue: Acknowledge
        Queue->>LocalDB: Clear synced items
    end
```

```mermaid
graph TD
    subgraph Mobile Device
        Input[Teacher Input: Grades/Attendance]
        LocalDB[(Local SQLite / WatermelonDB)]
        Queue[Background Sync Queue]
        
        Input -->|Writes instantly| LocalDB
        LocalDB -->|Pushes to queue| Queue
    end

    subgraph Cloud Infrastructure
        API[Node.js API]
        Postgres[(Central PostgreSQL DB)]
    end

    Queue -.->|Offline: Holds Data| Queue
    Queue -->|Reconnected: Syncs Data| API
    API --> Postgres
    Postgres -->|Acknowledges Write| API
    API -->|Clears Synced Items| Queue
```

---

## 6. Communication Module

Replacing fragmented WhatsApp groups with a secure, auditable, and professionally bounded messaging system.

- **1:1 Direct Messaging:** Teacher ↔︎ Parent with strict “Office Hours” enforced.
- **Grade-Wide Broadcast:** 1-way announcements from staff to parents (Push Notifications).
- **Community Groups:** Moderated 2-way chat for clubs or PTAs.

### 6.1 Messaging Routing Flow

```mermaid
graph LR
    subgraph Teacher App
        TD[Direct Message]
        TB[Broadcast Message]
        TC[Community Message]
    end

    Server((Cloud Message Server & DB))
    Audit[Admin Audit Log]

    subgraph Parent App
        PD[Direct Message UI]
        PB[Push Notification View]
        PC[Community Group UI]
    end

    TD <-->|2-Way Chat| Server
    Server <--> PD

    TB -->|1-Way Push| Server
    Server -->|Trigger APNs/FCM| PB

    TC <-->|Moderated 2-Way| Server
    Server <--> PC

    Server -->|Store all logs| Audit
```

### 6.2 Role-Based Messaging Flow

```mermaid
sequenceDiagram
    actor Teacher
    participant DB as Central DB & Server
    actor Parent
    
    Teacher->>DB: Sends Direct Message
    Note right of DB: Checks Teacher Office Hours<br/>Logs to Admin Audit Trail
    DB-->>Parent: Triggers Push Notification
    Parent->>DB: Reads and Replies
    DB-->>Teacher: Routes to Teacher Queue
```

---

## 7. Staff Leave & Substitution Workflow

When a teacher takes leave, it directly impacts the Academic Engine (requires a substitute) and the Finance Engine (payroll deduction).

### 7.1 Automated Substitution & Payroll Flow

```mermaid
graph TD
    T[Teacher App: Submit Leave] --> DB[(Database)]
    DB --> P{Principal Dashboard}

    P -->|Reject| R[Leave Rejected]
    P -->|Approve| Status{Leave Status}

    Status -->|Paid Leave| Acad[Academic Admin: Assign Substitute]
    Status -->|Paid Leave| Fin1[Finance: No Deduction]

    Status -->|Unpaid Leave| Acad
    Status -->|Unpaid Leave| Fin2[Finance: Deduct from Salary]

    Acad --> Matrix[Substitution Matrix Algorithm]
    Matrix --> Alert[Push Notification to Free Teacher]
```

```mermaid
graph TD
    Req[Teacher Submits Leave Request] --> App{Principal Approval}
    App -->|Approved - Paid/Unpaid| Sub[Academic Admin: Substitution Matrix]
    App -->|Approved - Unpaid| Pay[Finance Admin: Payroll Deduction]
    App -->|Rejected| End[Notify Teacher]
    Sub --> Push[Push Notification to Substitute]
```

### 8. Two-Pillar Architecture

```mermaid
graph LR
    subgraph Enterprise ERP
        NextJS[Next.js Web Client]
        Fin[Finance/Ledgers]
        Sched[Master Scheduling]
        HR[HR & Payroll]
        NextJS --> Fin
        NextJS --> Sched
        NextJS --> HR
    end

    subgraph Central Data Layer
        API[API Gateway / Node.js]
        DB[(Multi-Tenant PostgreSQL)]
        API <--> DB
    end

    subgraph Communication Bridge
        Flutter[Flutter Mobile Client]
        Push[Push Notifications]
        DM[1:1 Messaging]
        Bus[Live Bus Tracking]
        Flutter --> Push
        Flutter --> DM
        Flutter --> Bus
    end

    Fin --> API
    Sched --> API
    HR --> API
    
    API --> Push
    API --> DM
    API --> Bus
```

## 9. Tenant System & Component Hierarchy

```mermaid
graph TD
    Root[Single School Tenant]
    
    Root --> Web[Web Admin Apps - React/Next.js]
    Root --> Staff[Mobile Staff Apps - Flutter]
    Root --> Users[Mobile User Apps - Flutter]
    
    Web --> SysConfig[System Configuration & RBAC]
    Web --> FinOps[Finance & Operations]
    Web --> AcadAdmin[Academic Administration]
    
    Staff --> TeachHub[Teacher Hub]
    Staff --> DriverApp[Driver Utility]
    
    TeachHub --> Grades[Offline Gradebook]
    TeachHub --> Attend[Geo-fenced Attendance]
    
    Users --> ParentApp[Parent & Student Portal]
    ParentApp --> PushNotif[Real-time Notifications]
    ParentApp --> PayGate[Fee Payments]
```

## 10. School SaaS Ecosystem Architecture

```mermaid
graph TD
    SA[Super Admin / SaaS Owner] --> S1[School Tenant A]
    SA --> S2[School Tenant B]
    
    S1 --> W1[Web Admin Portal]
    S1 --> M1[Mobile Apps]
    
    S2 --> W2[Web Admin Portal]
    S2 --> M2[Mobile Apps]

```


## 11. Project Specifications & Feature Breakdown

```mermaid
graph TD
    Root[Orulabs SaaS Platform] --> Web[Enterprise Web ERP]
    Root --> Mobile[Mobile Communication Bridge]
    Root --> Core[Core Infrastructure]

    %% Web ERP Modules
    Web --> W1[Financial Operations]
    Web --> W2[Academic Administration]
    Web --> W3[HR & Payroll]
    Web --> W4[System Config & RBAC]

    W1 -.-> F1(Fee Ledgers & Invoicing)
    W2 -.-> A1(Master Scheduling)
    W3 -.-> H1(Leave Substitution Matrix)

    %% Mobile Modules
    Mobile --> M1[Teacher Hub]
    Mobile --> M2[Parent Portal]
    Mobile --> M3[Driver Utility]

    M1 -.-> T1(Offline Gradebook)
    M1 -.-> T2(Geo-fenced Attendance)
    M1 -.-> T3(Direct Messaging)

    M2 -.-> P1(Real-time Notifications)
    M2 -.-> P2(Live Bus Tracking)
    M2 -.-> P3(Fee Payments)

    %% Core Services
    Core --> C1[Multi-tenant Isolation]
    Core --> C2[Background Sync Queue]
    Core --> C3[Audit Logging]
```

## 12. Technical Stack Architecture

This diagram maps the chosen technologies across the client, API, data, and external service layers. It highlights the offline-first data relationship on mobile and the separation of client applications. When naming nodes, capitalizing reserved words prevents parsing errors in Mermaid.

```mermaid
graph TB
    subgraph ClientLayer [Client Layer / Mobile Native]
        Flutter["Flutter (iOS & Android)"]
        SQLite[("SQLite / WatermelonDB")]
        
        Flutter <-->|Writes Instantly / Offline First| SQLite
    end

    subgraph VPSHostingLayer [VPS Hosted Infrastructure]
        Next["Next.js Web Ecosystem (SaaS Admin, ERP, Landing)"]
        Node["Node.js API Gateway (NestJS)"]
        Redis[("Redis (Background Queues)")]
        
        Node <-->|Task Processing| Redis
        Next <-->|REST / GraphQL API| Node
    end

    subgraph DataLayer [Cloud Data & Storage]
        Postgres[("Firebase Data Connect - PostgreSQL")]
        S3[("S3 / Edge Object Storage (R2)")]
    end

    subgraph ExternalServices [Third-Party Services]
        Auth["OAuth2 / Auth0"]
        Comm["FCM (Push) & SMS Gateway"]
        Pay["Stripe / Razorpay"]
    end

    %% Network Connections
    Next <-->|REST / GraphQL API| Node
    SQLite <-->|Opportunistic Sync| Node
    
    Node <-->|Read/Write| Postgres
    Node -->|Pre-signed URLs| S3
    
    %% Service Integrations
    Node <--> Auth
    Node --> Comm
    Next --> Pay
    Flutter --> Pay

```
