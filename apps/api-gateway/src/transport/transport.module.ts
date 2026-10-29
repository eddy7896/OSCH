import { Module } from '@nestjs/common';
import { TransportController } from './transport.controller.js';
import { TransportService } from './transport.service.js';

@Module({ controllers: [TransportController], providers: [TransportService] })
export class TransportModule {}
