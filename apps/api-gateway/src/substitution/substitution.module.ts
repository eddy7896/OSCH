import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { SubstitutionController } from './substitution.controller.js';
import { SubstitutionService } from './substitution.service.js';

@Module({ imports: [TeachingModule], controllers: [SubstitutionController], providers: [SubstitutionService] })
export class SubstitutionModule {}
