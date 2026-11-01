import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { TeachingModule } from '../teaching/teaching.module.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';

@Module({ imports: [FilesModule, TeachingModule], controllers: [ResourcesController, CommentsController], providers: [ResourcesService, CommentsService] })
export class ResourcesModule {}
