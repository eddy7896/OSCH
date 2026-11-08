import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { MessagesController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';

@Module({ imports: [TeachingModule], controllers: [MessagesController], providers: [MessagingService] })
export class MessagingModule {}
