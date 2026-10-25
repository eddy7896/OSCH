import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { LeaveController } from './leave.controller.js';
import { LeaveService } from './leave.service.js';

@Module({ imports: [TeachingModule], controllers: [LeaveController], providers: [LeaveService] })
export class LeaveModule {}
