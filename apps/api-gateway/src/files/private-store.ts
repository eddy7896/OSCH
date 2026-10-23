import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config } from '../config/env.js';

/** Injection token for the private store (null when the private bucket is not configured; tests replace it). */
export const PRIVATE_STORE = Symbol('PRIVATE_STORE');

/**
 * Student photos and documents. The bucket has NO public address: a file can be read only through an address this service
 * signs, for a few minutes, after the caller's school and role have been checked.
 */
export interface PrivateStore {
  /** A PUT address that only accepts exactly this content type and length until it expires. */
  presignPut(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<string>;
  /** A GET address valid for a few minutes; `downloadName` makes the browser save the file under that name. */
  presignGet(input: { key: string; expiresInSeconds: number; downloadName?: string }): Promise<string>;
  /** What is stored under the key, or null if nothing is. */
  head(key: string): Promise<{ sizeBytes: number; contentType: string } | null>;
  /** Deletes the object (not an error if it is already gone). */
  remove(key: string): Promise<void>;
}

export function createR2PrivateStore(config: R2Config, bucket: string): PrivateStore {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });
  return {
    presignPut: ({ key, contentType, contentLength, expiresInSeconds }) =>
      getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }), {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(['content-type', 'content-length']),
      }),
    presignGet: ({ key, expiresInSeconds, downloadName }) =>
      getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key, ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${downloadName.replace(/["\\\r\n]/g, '_')}"` } : {}) }),
        { expiresIn: expiresInSeconds },
      ),
    async head(key) {
      try {
        const out = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { sizeBytes: out.ContentLength ?? 0, contentType: out.ContentType ?? '' };
      } catch (e) {
        if ((e as { name?: string; $metadata?: { httpStatusCode?: number } }).name === 'NotFound' || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
        throw e;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
