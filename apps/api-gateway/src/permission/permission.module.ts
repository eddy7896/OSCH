import { Module } from '@nestjs/common';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { PermissionGuard } from './permission.guard.js';
import { RouteDecisionCheck } from './route-decision.check.js';

@Module({
  imports: [DiscoveryModule],
  // Registered after TenantModule (AppModule import order): throttle, authenticate, resolve school, authorise.
  providers: [RouteDecisionCheck, { provide: APP_GUARD, useClass: PermissionGuard }],
  exports: [RouteDecisionCheck],
})
export class PermissionModule {}
