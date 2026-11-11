import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({ imports: [TeachingModule], controllers: [TripsController], providers: [TripsService] })
export class TripsModule {}
