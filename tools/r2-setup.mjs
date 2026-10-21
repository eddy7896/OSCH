#!/usr/bin/env node
// Applies the bucket's CORS rules so browsers may upload logos straight to it. DRY RUN by default: prints what would change.
//   node tools/r2-setup.mjs            show the plan
//   node tools/r2-setup.mjs --apply    set the rules on the bucket
// Reads the master .env.local (R2_*, CORS_ORIGINS). Never prints keys.
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { corsRules, endpointFor, loadMasterEnv, r2FromEnv, sameRules } from "./r2/lib.mjs";

loadMasterEnv();
const apply = process.argv.includes("--apply");
const settings = r2FromEnv(process.env);
if (!settings.ok) {
  console.error(`R2 is not configured yet:\n${settings.problems.map((p) => `  - ${p}`).join("\n")}\nSee documentation/r2-setup.md.`);
  process.exit(2);
}
const { accountId, accessKey, secretKey, bucket } = settings.config;
let wanted;
try {
  wanted = corsRules(process.env.CORS_ORIGINS);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(2);
}
const client = new S3Client({ region: "auto", endpoint: endpointFor(accountId), credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });

let current = [];
try {
  current = (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules ?? [];
} catch (e) {
  if (e?.name !== "NoSuchCORSConfiguration") {
    console.error(`could not read the bucket's CORS rules (${e?.name ?? "error"}). Check the bucket name and that the API token may edit it.`);
    process.exit(1);
  }
}
console.log(`bucket      ${bucket}`);
console.log(`origins     ${wanted[0].AllowedOrigins.join(", ")}`);
console.log(`methods     ${wanted[0].AllowedMethods.join(", ")}`);
if (sameRules(current, wanted)) {
  console.log("\nalready set: nothing to change.");
  process.exit(0);
}
if (!apply) {
  console.log(`\ndry run: ${current.length ? "would replace the bucket's current CORS rules" : "the bucket has no CORS rules yet; would set them"}. Add --apply to do it.`);
  process.exit(0);
}
await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: wanted } }));
console.log("\ndone: CORS rules set.");
