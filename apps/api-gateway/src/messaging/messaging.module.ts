import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { MessagesController } from './messaging.controller.js';
import { MessageAuditController, MessageReportsController } from './review.controller.js';
import { MessageReviewService } from './review.service.js';
import { MessagingService } from './messaging.service.js';

@Module({ imports: [TeachingModule], controllers: [MessagesController, MessageReportsController, MessageAuditController], providers: [MessagingService, MessageReviewService] })
export class MessagingModule {}
