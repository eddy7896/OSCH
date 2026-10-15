# Backend & Infrastructure Setup

## 1. Global Environment & Configuration
> **Superseded by `environment.md`.** Secrets belong to the NestJS API Gateway only; web apps get `NEXT_PUBLIC_*` values and Flutter apps get public `--dart-define` values. Never pass these secrets to a mobile build.

Reference set of variables (see `.env.example` for the per-app split):

```env
# Firebase Data Connect (PostgreSQL)
FIREBASE_PROJECT_ID="<your-project-id>"

# Cloudflare R2 (S3-Compatible CDN / Storage)
R2_ACCOUNT_ID="<your-r2-account-id>"
R2_ACCESS_KEY="<your-access-key>"
R2_SECRET_KEY="<your-secret-key>"
R2_BUCKET_NAME="oruschools-media"
R2_PUBLIC_URL="https://cdn.oruschools.com"

# API Gateway
PORT=3000
```

## 2. Real-Time Communications & Messaging (Architecture Recommendation)

For the OruSchools platform, supporting real-time messaging (e.g., Parent-Teacher communication or Staff Groups) requires a scalable approach. Based on the most updated Firebase documentation, we recommend a **Hybrid Database Strategy**:

### **A. Cloud Firestore (Primary Chat Store)**
* **Why:** Firestore is optimized for large collections and complex queries. It scales automatically and handles deep, nested data well.
* **Usage:** 
  * Storing chat channels/threads.
  * Storing the actual chat messages (with timestamps).
  * Read receipts (`readBy` arrays).

### **B. Firebase Realtime Database (RTDB) (Presence & Telemetry)**
* **Why:** RTDB is highly optimized for extremely low-latency, small-payload updates and has built-in connection state tracking (`onDisconnect`).
* **Usage:** 
  * Tracking user presence (Online / Offline / Away).
  * "Typing..." indicators.

### **C. Firebase SQL Connect (Data Connect)**
* **Usage:** The core ERP data (Student records, Fees, Master schedules) lives here in PostgreSQL. Chat metadata in Firestore will loosely reference the UUIDs from the PostgreSQL database.

## 3. NestJS API Gateway Setup
The API Gateway acts as the secure entry point. It will:
- Validate Firebase Auth tokens.
- Execute server-side queries to Firebase Data Connect (Postgres).
- Provide pre-signed URLs for uploading attachments directly to Cloudflare R2 (avoiding heavy payloads through the Node.js server).

## 4. Setup Steps (Checklist)
1. Provide the **Firebase Project ID**.
2. Run `firebase use <PROJECT_ID>`.
3. Run `firebase init dataconnect` to scaffold the PostgreSQL schema.
4. Scaffold the NestJS application in `apps/api-gateway`.
5. Create Cloudflare R2 bucket and paste credentials into `.env.local`.
