import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConsentController } from './consent.controller.js';
import { ConsentGuard } from './consent.guard.js';
import { ConsentService } from './consent.service.js';

@Global()
@Module({
  controllers: [ConsentController],
  // Registered after PermissionModule (AppModule import order): throttle, authenticate, school, permission, then consent.
  providers: [ConsentService, { provide: APP_GUARD, useClass: ConsentGuard }],
  exports: [ConsentService],
})
export class ConsentModule {}
