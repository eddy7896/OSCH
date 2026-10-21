import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Env, r2Config } from '../config/env.js';
import { createR2Signer } from './r2-signer.js';
import { UploadsController } from './uploads.controller.js';
import { UPLOAD_SIGNER, UploadsService } from './uploads.service.js';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: UPLOAD_SIGNER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const r2 = r2Config({
          R2_ACCOUNT_ID: config.get('R2_ACCOUNT_ID', { infer: true }),
          R2_ACCESS_KEY: config.get('R2_ACCESS_KEY', { infer: true }),
          R2_SECRET_KEY: config.get('R2_SECRET_KEY', { infer: true }),
          R2_BUCKET_NAME: config.get('R2_BUCKET_NAME', { infer: true }),
          R2_PUBLIC_URL: config.get('R2_PUBLIC_URL', { infer: true }),
        });
        return r2 ? createR2Signer(r2) : null;
      },
    },
  ],
})
export class UploadsModule {}
