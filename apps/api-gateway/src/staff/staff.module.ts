import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { StaffController } from './staff.controller.js';
import { StaffFilesService } from './staff-files.service.js';
import { StaffService } from './staff.service.js';

@Module({ imports: [FilesModule], controllers: [StaffController], providers: [StaffService, StaffFilesService] })
export class StaffModule {}
