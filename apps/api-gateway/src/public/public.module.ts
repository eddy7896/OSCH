import { Global, Module } from '@nestjs/common';
import { PublicSchoolsController } from './public-schools.controller.js';
import { PublicSchoolsService } from './public-schools.service.js';

@Global()
@Module({ controllers: [PublicSchoolsController], providers: [PublicSchoolsService], exports: [PublicSchoolsService] })
export class PublicModule {}
