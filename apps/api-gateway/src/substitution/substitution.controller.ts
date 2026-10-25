import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AssignDto, DutyListDto, IdParamDto, NeedDto, NeedListDto, RangeQueryDto, SuggestionsDto, SuggestionsQueryDto } from './dto/substitution.dto.js';
import { SubstitutionService } from './substitution.service.js';

/**
 * The substitution board (P3-7). School routes: `X-School-Id` + the `academics` grant. The Academic admin decides (nothing is assigned automatically); the Principal reads;
 * a Teacher sees only their own cover duties.
 */
@Controller('substitutions')
export class SubstitutionController {
  constructor(private readonly substitutions: SubstitutionService) {}

  /** Lessons left uncovered by approved leave between two dates, each with its substitute if one was chosen. */
  @Permission('academics', 'read')
  @Get('needs')
  needs(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: RangeQueryDto): Promise<NeedListDto> {
    if (g.scope !== 'school') throw new NotFoundException();
    return this.substitutions.needs(t, q.from, q.to);
  }

  /** Who can cover one lesson on one date: free in that period, not on leave, qualified; fewest substitutions this month first. */
  @Permission('academics', 'read')
  @Get('suggestions')
  suggestions(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: SuggestionsQueryDto): Promise<SuggestionsDto> {
    if (g.scope !== 'school') throw new NotFoundException();
    return this.substitutions.suggestions(t, q.entryId, q.date);
  }

  @Permission('academics', 'read')
  @Get('mine')
  mine(@Tenant() t: TenantContext, @Query() q: RangeQueryDto): Promise<DutyListDto> {
    return this.substitutions.mine(t, q.from, q.to);
  }

  /** Confirms or changes the substitute of one lesson on one date. 409 names why a person cannot cover it. */
  @Permission('academics', 'update')
  @Audit({ action: 'academic.substitution.set', operation: 'SetSubstitute' })
  @Put()
  assign(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: AssignDto): Promise<NeedDto> {
    if (g.scope !== 'school') throw new ForbiddenException();
    return this.substitutions.assign(t, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'academic.substitution.clear', operation: 'ClearSubstitute' })
  @HttpCode(204)
  @Delete(':id')
  async clear(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    if (g.scope !== 'school') throw new ForbiddenException();
    await this.substitutions.clear(t, p.id);
  }
}
