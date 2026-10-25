import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { GradesController } from './grades.controller.js';
import { GradesService } from './grades.service.js';

@Module({ imports: [TeachingModule], controllers: [GradesController], providers: [GradesService] })
export class GradesModule {}
