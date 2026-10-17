import { Global, Module } from '@nestjs/common';
import { UserSyncService } from './user-sync.service.js';

@Global()
@Module({ providers: [UserSyncService], exports: [UserSyncService] })
export class UsersModule {}
