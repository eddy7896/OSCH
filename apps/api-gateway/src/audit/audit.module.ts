import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor.js';
import { SECURITY_EVENTS } from './security-events.js';
import { AuditService } from './audit.service.js';

@Global()
@Module({ providers: [AuditService, { provide: SECURITY_EVENTS, useExisting: AuditService }, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }], exports: [AuditService, SECURITY_EVENTS] })
export class AuditModule {}
