import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { StudentLeaveController } from './student-leave.controller.js';
import { StudentLeaveService } from './student-leave.service.js';

@Module({ imports: [TeachingModule], controllers: [StudentLeaveController], providers: [StudentLeaveService] })
export class StudentLeaveModule {}
