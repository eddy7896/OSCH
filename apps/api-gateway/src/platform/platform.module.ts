import { Module } from '@nestjs/common';
import { PlatformSchoolsController } from './platform-schools.controller.js';
import { PlatformSchoolsService } from './platform-schools.service.js';
import { SchoolAdminsService } from './school-admins.service.js';

@Module({ controllers: [PlatformSchoolsController], providers: [PlatformSchoolsService, SchoolAdminsService] })
export class PlatformModule {}
