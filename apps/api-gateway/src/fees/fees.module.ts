import { Module } from '@nestjs/common';
import { TeachingModule } from '../teaching/teaching.module.js';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';

@Module({ imports: [TeachingModule], controllers: [FeesController, InvoicesController, ReceiptsController], providers: [FeesService, InvoicesService, ReceiptsService] })
export class FeesModule {}
