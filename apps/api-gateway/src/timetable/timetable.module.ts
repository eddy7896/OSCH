import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { TimetableController } from './timetable.controller.js';
import { TimetableService } from './timetable.service.js';

@Module({ imports: [TeachingModule], controllers: [TimetableController], providers: [TimetableService] })
export class TimetableModule {}
