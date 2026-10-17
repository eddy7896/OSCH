import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/authenticated-user.js';
import { NoAudit } from '../audit/audit.decorators.js';
import { UserScoped } from '../tenant/tenant.decorators.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import type { MeResponseDto } from './dto/me-response.dto.js';
import { MeService } from './me.service.js';

/** The signed-in user's own profile. Signed in, no school required: `@UserScoped()` is the access decision (self-service only). */
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  /** Profile, memberships and, if `X-School-Id` names a school the caller belongs to, the role's permissions and navigation. */
  @UserScoped()
  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Headers('x-school-id') school?: string): Promise<MeResponseDto> {
    return this.me.me(user, school);
  }

  @UserScoped()
  @NoAudit('self-service preference on the caller own user row; no tenant data and no privilege change')
  @Patch('preferences')
  preferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePreferencesDto): Promise<{ language: string | null }> {
    return this.me.setLanguage(user, dto.language);
  }
}
