# Cloudflare R2: setting up file uploads

The gateway never handles uploaded files. It hands the browser a short-lived address (`POST /v1/uploads/school-logo`, ADR-0008 addendum) and the browser sends the file straight to a Cloudflare R2 bucket. This is everything to set up outside the code. The keys go in the master `.env.local` and nowhere else.

## 1. In the Cloudflare dashboard (about ten minutes)
1. **R2 Object Storage, Create bucket.** Name it, for example, `oruschools-media`. Location hint: Asia-Pacific (your schools and their parents are in India). Leave it private for now.
2. **Account id.** R2 overview, right-hand panel: "Account ID" (32 characters). Put it in `R2_ACCOUNT_ID`. The S3 address shown next to it (`https://<id>.r2.cloudflarestorage.com`) is accepted too.
3. **API token.** R2, Manage API tokens, Create API token. Permission: **Object Read & Write**. Scope it to **this bucket only** (not the whole account). Copy the Access Key ID and Secret Access Key now (the secret is shown once): `R2_ACCESS_KEY` and `R2_SECRET_KEY`.
4. **Public address (for showing logos).** Bucket, Settings, Public access: either connect a **custom domain** (recommended, for example `media.oruschools.com`) or enable the **r2.dev** address (fine for development only, rate limited). Put it in `R2_PUBLIC_URL`.

## 2. In `.env.local` at the repo root
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET_NAME=oruschools-media
R2_PUBLIC_URL=https://media.oruschools.com
```
Restart the gateway. Without all four, `POST /v1/uploads/school-logo` answers 503 and nothing else changes. (In production the gateway refuses to start with a half-filled group.)

## 3. Let browsers upload (bucket CORS)
```
node tools/r2-setup.mjs            # shows what it would set; changes nothing
node tools/r2-setup.mjs --apply    # sets it
```
It allows `PUT`, `GET` and `HEAD` from the addresses in `CORS_ORIGINS` (the same list the gateway uses, school wildcards included) and nothing else: no wildcard origin, no `DELETE`. Run it again after `CORS_ORIGINS` changes; running it twice changes nothing.

## 4. Check it end to end
```
node tools/r2-smoke.mjs            # shows the plan
node tools/r2-smoke.mjs --apply    # writes ONE 70-byte image under smoke/ and deletes it
```
It must print four `PASS` lines: a body of a different length is refused, the signed type and length is accepted, a different content type is refused, and the public address serves the same bytes. A `FAIL` on the first or third line means the size and type lock is not working: do not ship uploads until it is.

## 5. The private bucket (student photos and documents)
Student files must never share the public bucket. Make a second one:
1. **Create bucket**, for example `oschools-private`, same location hint. **Do not** enable the r2.dev address and **do not** connect a custom domain: with no public address the only way to read a file is a short-lived signed address the gateway issues after checking who is asking.
2. **Same token, both buckets.** R2, Manage API tokens, edit the existing token, and add the new bucket (Object Read & Write). Keep it scoped to these two buckets only. The keys stay the same, so nothing to re-paste.
3. In `.env.local`: `R2_PRIVATE_BUCKET_NAME=oschools-private`. Restart the gateway.
4. **CORS** on the private bucket: the same rule as the public one (the browser PUTs the file straight to the bucket). Paste it in the bucket's Settings, CORS Policy.
5. Check there is no public access: bucket Settings, Public access shows "Not allowed" / r2.dev disabled.

## Things to know
- **Everything in a bucket with a public address is readable by anyone who knows the file's address.** Keys contain a random UUID, so they cannot be guessed, but treat this bucket as holding only things meant to be public (school logos). Student documents, photos and anything private need a **separate private bucket** with presigned *read* addresses (a later phase). Do not put them here.
- The keys never reach a browser or a mobile app. The upload address contains a signature, not the key, and expires after five minutes.
- Cost: R2 has a free tier (10 GB-month stored, 1 million writes and 10 million reads a month) and **no egress fees**. Logos are tiny.
- Rotate the API token whenever it may have been exposed; update `.env.local` and restart the gateway. Old upload addresses stop working at once.
- The files tools (`tools/r2-setup.mjs`, `tools/r2-smoke.mjs`) are dry runs unless `--apply` is given, and never print a key.
