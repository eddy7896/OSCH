import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config } from '../config/env.js';
import type { UploadSigner } from './uploads.service.js';

/** Signs locally with the R2 keys (no request is made to Cloudflare). Content type and length are signed headers, so R2 refuses any other body. */
export function createR2Signer(config: R2Config): UploadSigner {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });
  return {
    publicUrl: config.publicUrl ?? null,
    presignPut: ({ key, contentType, contentLength, expiresInSeconds }) =>
      getSignedUrl(client, new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType, ContentLength: contentLength }), {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(['content-type', 'content-length']),
      }),
  };
}
