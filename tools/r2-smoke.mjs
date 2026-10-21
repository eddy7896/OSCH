#!/usr/bin/env node
// A real round trip against the bucket: sign an upload address, PUT a 1x1 PNG, check that a body of another length is refused,
// read it back, delete it. DRY RUN by default; --apply writes ONE small object under smoke/ and removes it.
//   node tools/r2-smoke.mjs --apply
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TINY_PNG, endpointFor, loadMasterEnv, r2FromEnv } from "./r2/lib.mjs";

loadMasterEnv();
const apply = process.argv.includes("--apply");
const settings = r2FromEnv(process.env);
if (!settings.ok) {
  console.error(`R2 is not configured yet:\n${settings.problems.map((p) => `  - ${p}`).join("\n")}\nSee documentation/r2-setup.md.`);
  process.exit(2);
}
const { accountId, accessKey, secretKey, bucket, publicUrl } = settings.config;
const key = `smoke/${randomUUID()}.png`;
console.log(`bucket ${bucket}, object ${key} (${TINY_PNG.length} bytes), public address ${publicUrl ?? "not set"}`);
if (!apply) {
  console.log("dry run: would upload the object, try a wrong-length upload, read it back and delete it. Add --apply.");
  process.exit(0);
}

const client = new S3Client({ region: "auto", endpoint: endpointFor(accountId), credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });
const sign = (length) => getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "image/png", ContentLength: length }), { expiresIn: 120, signableHeaders: new Set(["content-type", "content-length"]) });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

try {
  const wrong = await fetch(await sign(TINY_PNG.length), { method: "PUT", headers: { "Content-Type": "image/png" }, body: Buffer.concat([TINY_PNG, Buffer.from([0])]) });
  check("an upload of a different length is refused", wrong.status >= 400 && wrong.status < 500, `HTTP ${wrong.status}`);

  const ok = await fetch(await sign(TINY_PNG.length), { method: "PUT", headers: { "Content-Type": "image/png" }, body: TINY_PNG });
  check("an upload of the signed type and length is accepted", ok.ok, `HTTP ${ok.status}`);

  const wrongType = await fetch(await sign(TINY_PNG.length), { method: "PUT", headers: { "Content-Type": "text/html" }, body: TINY_PNG });
  check("an upload of a different type is refused", wrongType.status >= 400 && wrongType.status < 500, `HTTP ${wrongType.status}`);

  if (publicUrl) {
    const back = await fetch(`${publicUrl}/${key}`);
    const bytes = Buffer.from(await back.arrayBuffer());
    check("the public address serves the same bytes", back.ok && bytes.equals(TINY_PNG), `HTTP ${back.status}`);
  } else console.log("skip  public address not set (R2_PUBLIC_URL)");
} finally {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).then(() => console.log("clean the test object is deleted"), (e) => console.error(`could not delete ${key} (${e?.name}); remove it by hand`));
}
process.exit(results.every(Boolean) ? 0 : 1);
