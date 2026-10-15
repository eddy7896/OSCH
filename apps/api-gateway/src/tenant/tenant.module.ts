import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MembershipService } from './membership.service.js';
import { TenantGuard } from './tenant.guard.js';

@Global()
@Module({
  // Registered after AuthModule (AppModule import order): throttle, then authenticate, then resolve the school.
  providers: [MembershipService, { provide: APP_GUARD, useClass: TenantGuard }],
  exports: [MembershipService],
})
export class TenantModule {}
