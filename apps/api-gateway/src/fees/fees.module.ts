import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';

@Module({ controllers: [FeesController, InvoicesController, ReceiptsController], providers: [FeesService, InvoicesService, ReceiptsService] })
export class FeesModule {}
