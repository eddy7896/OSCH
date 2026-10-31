import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { TeachingModule } from '../teaching/teaching.module.js';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';

@Module({ imports: [FilesModule, TeachingModule], controllers: [ResourcesController], providers: [ResourcesService] })
export class ResourcesModule {}
