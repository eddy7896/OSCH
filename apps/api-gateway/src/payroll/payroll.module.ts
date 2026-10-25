import { Module } from '@nestjs/common';
import { LeaveDeductionController } from './leave-deduction.controller.js';
import { LeaveDeductionService } from './leave-deduction.service.js';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';

@Module({ controllers: [PayrollController, LeaveDeductionController], providers: [PayrollService, LeaveDeductionService] })
export class PayrollModule {}
