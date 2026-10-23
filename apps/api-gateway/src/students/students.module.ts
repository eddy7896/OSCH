import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { StudentFilesController } from './student-files.controller.js';
import { StudentFilesService } from './student-files.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({ imports: [FilesModule], controllers: [StudentsController, StudentFilesController], providers: [StudentsService, StudentFilesService] })
export class StudentsModule {}
