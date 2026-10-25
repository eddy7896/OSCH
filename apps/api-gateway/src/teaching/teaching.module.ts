import { Module } from '@nestjs/common';
import { ParentLinksController, TeachingController } from './teaching.controller.js';
import { TeachingScope } from './teaching-scope.service.js';
import { TeachingService } from './teaching.service.js';

@Module({ controllers: [TeachingController, ParentLinksController], providers: [TeachingService, TeachingScope], exports: [TeachingScope] })
export class TeachingModule {}
