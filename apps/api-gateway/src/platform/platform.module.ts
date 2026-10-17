import { Module } from '@nestjs/common';
import { PlatformSchoolsController } from './platform-schools.controller.js';
import { PlatformSchoolsService } from './platform-schools.service.js';

@Module({ controllers: [PlatformSchoolsController], providers: [PlatformSchoolsService] })
export class PlatformModule {}
