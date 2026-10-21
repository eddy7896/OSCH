import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { SchoolLogoUploadDto, type UploadTicketDto } from './dto/school-logo-upload.dto.js';
import { UploadsService } from './uploads.service.js';

/** Upload addresses for files that go straight to object storage. School routes: the school comes from the verified membership. */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** The school's logo. Needs the `settings` update grant (System Admin). */
  @Permission('settings', 'update')
  @NoAudit('Issues a short-lived upload address and changes nothing; attaching the file to the school is a separate, audited step.')
  @Strict()
  @HttpCode(200)
  @Post('school-logo')
  schoolLogo(@Tenant() tenant: TenantContext, @Body() dto: SchoolLogoUploadDto): Promise<UploadTicketDto> {
    return this.uploads.schoolLogo(tenant, dto);
  }
}
