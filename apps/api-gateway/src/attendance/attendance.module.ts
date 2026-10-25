import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { AttendanceController, StaffAttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({ imports: [TeachingModule], controllers: [AttendanceController, StaffAttendanceController], providers: [AttendanceService] })
export class AttendanceModule {}
