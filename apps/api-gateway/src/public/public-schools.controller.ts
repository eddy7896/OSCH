import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import type { PublicSchoolDto } from './dto/public-school.dto.js';
import { SubdomainParamDto } from './dto/subdomain-param.dto.js';
import { PublicSchoolsService } from './public-schools.service.js';

/** Unauthenticated. `@Public()` is the access decision; the IP rate limit applies as to every route. */
@Controller('public/schools')
export class PublicSchoolsController {
  constructor(private readonly schools: PublicSchoolsService) {}

  /** Which school is this address? For the school's login page; see PublicSchoolsService for what is and is not revealed. */
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('by-subdomain/:sub')
  bySubdomain(@Param() p: SubdomainParamDto): Promise<PublicSchoolDto> {
    return this.schools.bySubdomain(p.sub);
  }
}
