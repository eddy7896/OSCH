import { Global, Module } from '@nestjs/common';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { PermissionGuard } from './permission.guard.js';
import { RecordRules } from './record-rules.service.js';
import { RouteDecisionCheck } from './route-decision.check.js';

@Global()
@Module({
  imports: [DiscoveryModule],
  // Registered after TenantModule (AppModule import order): throttle, authenticate, resolve school, authorise.
  providers: [RouteDecisionCheck, RecordRules, { provide: APP_GUARD, useClass: PermissionGuard }],
  exports: [RouteDecisionCheck, RecordRules],
})
export class PermissionModule {}
