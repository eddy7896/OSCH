import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { BroadcastsController } from './broadcasts.controller.js';
import { BroadcastsService } from './broadcasts.service.js';

@Module({ imports: [TeachingModule], controllers: [BroadcastsController], providers: [BroadcastsService] })
export class BroadcastsModule {}
