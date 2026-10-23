import { Body, Controller, ForbiddenException, HttpCode, Post } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { ImportReportDto, ImportRequestDto, ImportResultDto } from './dto/imports.dto.js';
import type { ImportKind } from './import-definitions.js';
import { ImportsService } from './imports.service.js';

const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new ForbiddenException();
};
const DRY = 'A dry run only reads and checks the file: it writes nothing, not even an audit row.';

/**
 * Bulk import from CSV. Always run the dry run first: the real import refuses a file with any problem, and a file that was already
 * imported cannot be imported again. Students and staff need the `create` grant of their module; guardians need `students` update.
 */
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  private dry(t: TenantContext, kind: ImportKind, g: GrantedPermission, dto: ImportRequestDto): Promise<ImportReportDto> {
    wide(g);
    return this.imports.dryRun(t, kind, dto.csv);
  }
  private run(t: TenantContext, kind: ImportKind, g: GrantedPermission, dto: ImportRequestDto): Promise<ImportResultDto> {
    wide(g);
    return this.imports.run(t, kind, dto.csv);
  }

  @Permission('students', 'create')
  @NoAudit(DRY)
  @Strict()
  @HttpCode(200)
  @Post('students/dry-run')
  studentsDryRun(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportReportDto> {
    return this.dry(t, 'students', g, dto);
  }

  @Permission('students', 'create')
  @Audit({ action: 'import.finish', operation: 'FinishImportBatch' })
  @Strict()
  @Post('students')
  students(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportResultDto> {
    return this.run(t, 'students', g, dto);
  }

  @Permission('staff', 'create')
  @NoAudit(DRY)
  @Strict()
  @HttpCode(200)
  @Post('staff/dry-run')
  staffDryRun(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportReportDto> {
    return this.dry(t, 'staff', g, dto);
  }

  @Permission('staff', 'create')
  @Audit({ action: 'import.finish', operation: 'FinishImportBatch' })
  @Strict()
  @Post('staff')
  staff(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportResultDto> {
    return this.run(t, 'staff', g, dto);
  }

  @Permission('students', 'update')
  @NoAudit(DRY)
  @Strict()
  @HttpCode(200)
  @Post('guardians/dry-run')
  guardiansDryRun(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportReportDto> {
    return this.dry(t, 'guardians', g, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'import.finish', operation: 'FinishImportBatch' })
  @Strict()
  @Post('guardians')
  guardians(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: ImportRequestDto): Promise<ImportResultDto> {
    return this.run(t, 'guardians', g, dto);
  }
}
