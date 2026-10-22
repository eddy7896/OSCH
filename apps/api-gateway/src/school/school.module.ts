import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller.js';
import { AcademicsService } from './academics.service.js';
import { SchoolController } from './school.controller.js';
import { SchoolService } from './school.service.js';

@Module({ controllers: [SchoolController, AcademicsController], providers: [SchoolService, AcademicsService] })
export class SchoolModule {}
