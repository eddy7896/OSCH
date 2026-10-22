import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env, r2Config } from '../config/env.js';
import { createR2PrivateStore, PRIVATE_STORE } from './private-store.js';

/** The private bucket for student files. Null when R2 or R2_PRIVATE_BUCKET_NAME is not set: the file routes then answer 503. */
@Module({
  providers: [
    {
      provide: PRIVATE_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const bucket = config.get('R2_PRIVATE_BUCKET_NAME', { infer: true });
        const r2 = r2Config({
          R2_ACCOUNT_ID: config.get('R2_ACCOUNT_ID', { infer: true }),
          R2_ACCESS_KEY: config.get('R2_ACCESS_KEY', { infer: true }),
          R2_SECRET_KEY: config.get('R2_SECRET_KEY', { infer: true }),
          R2_BUCKET_NAME: config.get('R2_BUCKET_NAME', { infer: true }),
          R2_PUBLIC_URL: undefined,
        });
        if (!r2 || !bucket || bucket === r2.bucket) return null; // never fall back to the public bucket
        return createR2PrivateStore(r2, bucket);
      },
    },
  ],
  exports: [PRIVATE_STORE],
})
export class FilesModule {}
