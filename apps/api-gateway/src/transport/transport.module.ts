import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { TransportController } from './transport.controller.js';
import { TransportService } from './transport.service.js';

@Module({ imports: [TeachingModule], controllers: [TransportController], providers: [TransportService] })
export class TransportModule {}
