import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { contrastWithWhite, isUsableBrandColor, MIN_CONTRAST } from './brand.js';
import type { SchoolProfileDto, SetSchoolLogoDto, UpdateSchoolProfileDto } from './dto/school.dto.js';

const FIELDS = ['name', 'address', 'contactPhone', 'contactEmail', 'primaryColor', 'defaultLanguage'] as const;

/** The active school's own profile and branding. The school is always the verified one; the request never names it. */
@Injectable()
export class SchoolService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async profile(tenant: TenantContext): Promise<SchoolProfileDto> {
    const s = (await this.db.getSchoolProfile({ schoolId: tenant.schoolId })).data.school;
    if (!s) throw new ApiException(ErrorCode.NOT_FOUND, 404);
    return {
      id: dashed(s.id), name: s.name, subDomain: s.subDomain, defaultLanguage: s.defaultLanguage, currency: s.currency, locale: s.locale,
      address: s.address ?? null, contactPhone: s.contactPhone ?? null, contactEmail: s.contactEmail ?? null,
      primaryColor: s.primaryColor ?? null, logoKey: s.logoKey ?? null,
      activeAcademicYear: s.activeAcademicYear ? { id: dashed(s.activeAcademicYear.id), name: s.activeAcademicYear.name } : null,
    };
  }

  async update(tenant: TenantContext, dto: UpdateSchoolProfileDto): Promise<SchoolProfileDto> {
    const sent = FIELDS.filter((f) => dto[f] !== undefined);
    if (sent.length === 0) throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'name', rule: 'atLeastOneField' }]);
    if (dto.primaryColor !== undefined && !isUsableBrandColor(dto.primaryColor)) {
      throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'primaryColor', rule: `contrastWithWhiteAtLeast${MIN_CONTRAST}(is ${contrastWithWhite(dto.primaryColor).toFixed(1)})` }]);
    }
    await this.db.updateSchoolProfile({
      schoolId: tenant.schoolId, actorId: tenant.userId,
      ...Object.fromEntries(sent.map((f) => [f, dto[f]])),
      details: { fields: sent },
    });
    return this.profile(tenant);
  }

  async setLogo(tenant: TenantContext, dto: SetSchoolLogoDto): Promise<SchoolProfileDto> {
    // Only a file uploaded under THIS school's logo prefix can become its logo, whatever key the request names.
    if (!new RegExp(`^schools/${tenant.schoolId}/logo/[0-9a-f-]{36}\\.(png|jpg|webp)$`).test(dto.key)) {
      throw new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field: 'key', rule: 'ownLogoPrefix' }]);
    }
    await this.db.setSchoolLogo({ schoolId: tenant.schoolId, actorId: tenant.userId, logoKey: dto.key, details: { logoKey: dto.key } });
    return this.profile(tenant);
  }
}
