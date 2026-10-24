import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

@Module({ controllers: [FeesController, InvoicesController], providers: [FeesService, InvoicesService] })
export class FeesModule {}
