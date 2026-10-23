#!/usr/bin/env node
// Round trip against the PRIVATE bucket (student photos and documents): upload with a signed address, prove the file cannot be
// read without a signature, read it with a signed address, delete it. DRY RUN by default; --apply writes ONE 70-byte object
// under smoke/ and removes it.
//   node tools/r2-smoke-private.mjs --apply
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TINY_PNG, endpointFor, loadMasterEnv, r2FromEnv } from "./r2/lib.mjs";

loadMasterEnv();
const apply = process.argv.includes("--apply");
const settings = r2FromEnv(process.env);
const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME;
const problems = settings.ok ? [] : settings.problems;
if (!privateBucket) problems.push("R2_PRIVATE_BUCKET_NAME is not set");
if (settings.ok && privateBucket === settings.config.bucket) problems.push("R2_PRIVATE_BUCKET_NAME is the same as R2_BUCKET_NAME: private files must not share the public bucket");
if (problems.length > 0) {
  console.error(`The private bucket is not configured yet:\n${problems.map((p) => `  - ${p}`).join("\n")}\nSee documentation/r2-setup.md.`);
  process.exit(2);
}
const { accountId, accessKey, secretKey, publicUrl } = settings.config;
const key = `smoke/${randomUUID()}.png`;
console.log(`private bucket ${privateBucket}, object ${key} (${TINY_PNG.length} bytes)`);
if (!apply) {
  console.log("dry run: would upload the object, try to read it without a signature, read it with one, and delete it. Add --apply.");
  process.exit(0);
}

const endpoint = endpointFor(accountId);
const client = new S3Client({ region: "auto", endpoint, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });
const signPut = (length) => getSignedUrl(client, new PutObjectCommand({ Bucket: privateBucket, Key: key, ContentType: "image/png", ContentLength: length }), { expiresIn: 120, signableHeaders: new Set(["content-type", "content-length"]) });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

try {
  const wrong = await fetch(await signPut(TINY_PNG.length), { method: "PUT", headers: { "Content-Type": "image/png" }, body: Buffer.concat([TINY_PNG, Buffer.from([0])]) });
  check("an upload of a different length is refused", wrong.status >= 400 && wrong.status < 500, `HTTP ${wrong.status}`);

  const put = await fetch(await signPut(TINY_PNG.length), { method: "PUT", headers: { "Content-Type": "image/png" }, body: TINY_PNG });
  check("an upload of the signed type and length is accepted", put.ok, `HTTP ${put.status}`);

  const bare = await fetch(`${endpoint}/${privateBucket}/${key}`);
  // R2 answers a request with no credentials at all with 400 InvalidArgument "Authorization"; 401 and 403 mean the same thing.
  const bareBytes = Buffer.from(await bare.arrayBuffer());
  check("the file cannot be read without a signature", [400, 401, 403].includes(bare.status) && !bareBytes.equals(TINY_PNG), `HTTP ${bare.status}`);

  if (publicUrl) {
    const viaPublic = await fetch(`${publicUrl}/${key}`);
    check("the public bucket's address does not serve it", viaPublic.status === 404 || viaPublic.status === 403, `HTTP ${viaPublic.status}`);
  }

  const signedGet = await getSignedUrl(client, new GetObjectCommand({ Bucket: privateBucket, Key: key }), { expiresIn: 60 });
  const back = await fetch(signedGet);
  const bytes = Buffer.from(await back.arrayBuffer());
  check("a signed read address serves the same bytes", back.ok && bytes.equals(TINY_PNG), `HTTP ${back.status}`);
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key })).then(() => console.log("clean the test object is deleted"), (e) => console.error(`could not delete ${key} (${e?.name}); remove it by hand`));
}
process.exit(results.every(Boolean) ? 0 : 1);
