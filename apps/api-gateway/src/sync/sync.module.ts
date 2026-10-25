import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({ imports: [TeachingModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
