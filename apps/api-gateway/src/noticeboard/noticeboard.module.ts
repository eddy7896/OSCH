import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { NoticeBoardController } from './noticeboard.controller.js';
import { NoticeBoardService } from './noticeboard.service.js';

@Module({ imports: [TeachingModule], controllers: [NoticeBoardController], providers: [NoticeBoardService] })
export class NoticeBoardModule {}
